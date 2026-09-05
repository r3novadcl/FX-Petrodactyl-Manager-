import { REST, Routes } from 'discord.js';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { c, RULE } from './colors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TAG = `${c.c1}${c.bold}[DEPLOY]${c.reset}`;

function collectCommandFiles(dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...collectCommandFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith('.js')) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

/** Registers every slash command in src/commands/slash with Discord. */
export default async function deployCommands(token, clientId) {
  if (!token || !clientId) {
    console.log(`  ${TAG} ${c.muted}TOKEN or CLIENT_ID missing — skipping deploy${c.reset}`);
    return;
  }

  const commandFiles = collectCommandFiles(join(__dirname, '../commands/slash'));
  const payload = [];

  for (const file of commandFiles) {
    try {
      const mod = await import(pathToFileURL(file).href);
      if (mod.default?.data) payload.push(mod.default.data.toJSON());
    } catch (err) {
      console.log(`  ${TAG} ${c.red}Could not load ${file} — ${err.message}${c.reset}`);
    }
  }

  console.log(`  ${RULE}`);
  console.log(`  ${TAG} ${c.white}${c.bold}Registering slash commands...${c.reset}`);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    await rest.put(Routes.applicationCommands(clientId), { body: payload });
    const list = payload.map((cmd) => `${c.c3}/${cmd.name}${c.reset}`).join(`  ${c.muted}|${c.reset}  `);
    console.log(
      `  ${TAG} ${c.green}${c.bold}OK${c.reset}  ${c.white}${payload.length} command${payload.length !== 1 ? 's' : ''} registered${c.reset}`
    );
    console.log(`  ${TAG} ${c.muted}Commands:${c.reset} ${list}`);
  } catch (err) {
    console.log(`  ${TAG} ${c.red}${c.bold}FAILED${c.reset}  ${c.red}registration failed — ${err.message}${c.reset}`);
  }

  console.log(`  ${RULE}`);
}
