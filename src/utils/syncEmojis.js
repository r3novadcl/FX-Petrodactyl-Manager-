import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { REST } from 'discord.js';
import https from 'https';
import http from 'http';
import { c, RULE } from './colors.js';
import { writeJsonAtomic } from './atomicJson.js';
import { reloadEmojiCache } from './emoji.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMOJI_REGEX = /^<(a?):(\w+):(\d+)>$/;
const EMOJI_PATH = join(__dirname, '../../storage/emoji.json');
const TAG = `${c.c1}${c.bold}[EMOJI]${c.reset}`;

function fetchFromUrl(url) {
  const client = url.startsWith('https') ? https : http;

  return new Promise((resolve) => {
    client
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchFromUrl(res.headers.location).then(resolve);
          return;
        }
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', () => resolve(null));
  });
}

function fetchEmojiImage(id, animated) {
  const ext = animated ? 'gif' : 'webp';
  return fetchFromUrl(`https://cdn.discordapp.com/emojis/${id}.${ext}`);
}

/**
 * Makes sure every emoji referenced in storage/emoji.json actually exists as
 * an application emoji on this bot, uploading/re-linking as needed.
 */
export default async function syncEmojis(token) {
  if (!token) {
    console.log(`  ${TAG} ${c.muted}No token — skipping sync${c.reset}`);
    return;
  }

  let config;
  try {
    config = JSON.parse(readFileSync(EMOJI_PATH, 'utf8'));
  } catch (err) {
    console.log(`  ${TAG} ${c.red}Could not read emoji.json — ${err.message}${c.reset}`);
    return;
  }

  console.log(`  ${RULE}`);
  console.log(`  ${TAG} ${c.white}${c.bold}Syncing application emojis...${c.reset}`);

  const rest = new REST({ version: '10' }).setToken(token);

  let appId;
  try {
    appId = (await rest.get('/applications/@me')).id;
  } catch (err) {
    console.log(`  ${TAG} ${c.red}${c.bold}FAILED${c.reset}  ${c.red}could not reach Discord API — ${err.message}${c.reset}`);
    console.log(`  ${RULE}`);
    return;
  }

  let uploadedEmojis = [];
  try {
    const res = await rest.get(`/applications/${appId}/emojis`);
    uploadedEmojis = Array.isArray(res) ? res : res.items ?? [];
  } catch (err) {
    console.log(`  ${TAG} ${c.red}${c.bold}FAILED${c.reset}  ${c.red}emoji fetch failed — ${err.message}${c.reset}`);
    console.log(`  ${RULE}`);
    return;
  }

  const entries = Object.entries(config);
  console.log(`  ${TAG} ${c.muted}Config: ${c.white}${entries.length}${c.muted}  |  Uploaded: ${c.white}${uploadedEmojis.length}${c.reset}`);

  let changed = false;
  let noActionCount = 0;
  let uploadedCount = 0;
  let fixedCount = 0;
  let failedCount = 0;
  const updated = { ...config };

  for (const [key, value] of entries) {
    const match = typeof value === 'string' && value.match(EMOJI_REGEX);

    if (!match) {
      console.log(`  ${TAG} ${c.muted}SKIP${c.reset}    ${c.white}${key}${c.muted}  (not a custom emoji)${c.reset}`);
      noActionCount++;
      continue;
    }

    const animated = match[1] === 'a';
    const name = match[2];
    const id = match[3];

    const existing = uploadedEmojis.find((e) => e.id === id) ?? uploadedEmojis.find((e) => e.name === name);

    if (existing) {
      const mention = existing.animated ? `<a:${existing.name}:${existing.id}>` : `<:${existing.name}:${existing.id}>`;
      if (value !== mention) {
        updated[key] = mention;
        changed = true;
        fixedCount++;
        console.log(`  ${TAG} ${c.yellow}FIXED${c.reset}   ${c.white}${name}${c.muted}  id corrected${c.reset}`);
      } else {
        noActionCount++;
        console.log(`  ${TAG} ${c.green}OK${c.reset}      ${c.white}${name}${c.muted}  present${c.reset}`);
      }
      continue;
    }

    console.log(`  ${TAG} ${c.c2}UPLOAD${c.reset}  ${c.white}${name}${c.muted}  uploading...${c.reset}`);
    const imageBuffer = await fetchEmojiImage(id, animated);
    if (!imageBuffer) {
      console.log(`  ${TAG} ${c.red}FAILED${c.reset}  ${c.white}${name}${c.red}  image download failed${c.reset}`);
      failedCount++;
      continue;
    }

    try {
      const mimeType = animated ? 'image/gif' : 'image/webp';
      const dataUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      const created = await rest.post(`/applications/${appId}/emojis`, { body: { name, image: dataUri } });
      updated[key] = created.animated ? `<a:${created.name}:${created.id}>` : `<:${created.name}:${created.id}>`;
      changed = true;
      uploadedCount++;
      console.log(`  ${TAG} ${c.green}OK${c.reset}      ${c.white}${name}${c.muted}  uploaded -> ${created.id}${c.reset}`);
    } catch (err) {
      console.log(`  ${TAG} ${c.red}FAILED${c.reset}  ${c.white}${name}${c.red}  upload failed — ${err.message}${c.reset}`);
      failedCount++;
    }
  }

  if (changed) {
    try {
      writeJsonAtomic(EMOJI_PATH, updated, 4);
      reloadEmojiCache();
      console.log(`  ${TAG} ${c.green}Saved emoji.json${c.reset}`);
    } catch (err) {
      console.log(`  ${TAG} ${c.red}Could not save emoji.json — ${err.message}${c.reset}`);
    }
  }

  const summary = [
    noActionCount ? `${c.muted}${noActionCount} ok${c.reset}` : null,
    fixedCount ? `${c.yellow}${fixedCount} fixed${c.reset}` : null,
    uploadedCount ? `${c.c3}${uploadedCount} uploaded${c.reset}` : null,
    failedCount ? `${c.red}${failedCount} failed${c.reset}` : null,
  ].filter(Boolean);

  console.log(`  ${TAG} ${c.white}${c.bold}Summary:${c.reset} ${summary.join(`  ${c.muted}|${c.reset}  `)}`);
  console.log(`  ${RULE}`);
}
