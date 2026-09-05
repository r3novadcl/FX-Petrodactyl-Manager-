import { ActivityType } from 'discord.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { PREFIX } from '../utils/config.js';
import { c, RULE } from '../utils/colors.js';
import { applyNameStyleToAllGuilds } from '../utils/nameStyle.js';
import { BRAND, BRAND_LINK } from '../utils/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TAG = `${c.c1}${c.bold}[READY]${c.reset}`;
const AVATAR_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

function findAvatarPath() {
  for (const ext of AVATAR_EXTS) {
    const path = join(__dirname, `../../storage/avatar.${ext}`);
    if (existsSync(path)) return path;
  }
  return null;
}

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    client.user.setPresence({
      activities: [{ name: `${BRAND}  ·  /help  ${PREFIX}help`, type: ActivityType.Custom }],
      status: 'dnd',
    });

    const avatarPath = findAvatarPath();
    if (avatarPath) {
      try {
        await client.user.setAvatar(readFileSync(avatarPath));
        console.log(`  ${TAG} ${c.green}OK${c.reset}  ${c.white}Avatar updated${c.reset}`);
      } catch (err) {
        console.log(`  ${TAG} ${c.yellow}WARN${c.reset}  ${c.white}Avatar not changed${c.muted}  (${err.message})${c.reset}`);
      }
    }

    console.log(`  ${RULE}`);
    console.log(`  ${TAG} ${c.green}${c.bold}ONLINE${c.reset}  ${c.muted}as${c.reset}  ${c.white}${c.bold}${client.user.username}${c.reset}`);
    console.log(
      `  ${TAG} ${c.muted}Guilds:${c.reset} ${c.white}${client.guilds.cache.size}${c.reset}   ${c.muted}Prefix:${c.reset} ${c.white}${PREFIX}${c.reset}   ${c.muted}Slash:${c.reset} ${c.white}/${c.reset}`
    );
    console.log(`  ${TAG} ${c.muted}${BRAND}${c.reset}  ${c.muted}|${c.reset}  ${c.c3}${BRAND_LINK}${c.reset}`);
    console.log(`  ${RULE}`);

    const nameplateTag = `${c.c1}${c.bold}[NAMEPLATE]${c.reset}`;
    console.log(`  ${nameplateTag} ${c.white}${c.bold}Applying nameplate style to all guilds...${c.reset}`);

    applyNameStyleToAllGuilds(client)
      .then(({ ok, failed, results }) => {
        console.log(`  ${nameplateTag} ${c.green}${c.bold}Done${c.reset}  ${c.white}${ok} applied${c.reset}${c.muted}, ${failed} failed${c.reset}`);
        for (const result of results) {
          if (!result.ok) {
            console.log(`  ${nameplateTag} ${c.yellow}SKIP${c.reset}  ${c.white}${result.guildId}${c.muted}  (${result.reason})${c.reset}`);
          }
        }
        console.log(`  ${RULE}`);
      })
      .catch((err) => {
        console.log(`  ${nameplateTag} ${c.red}${c.bold}FAILED${c.reset}  ${c.red}${err.message}${c.reset}`);
      });
  },
};
