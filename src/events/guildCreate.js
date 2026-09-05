import { c } from '../utils/colors.js';
import { applyNameStyleToGuild } from '../utils/nameStyle.js';

const TAG = `${c.c1}${c.bold}[NAMEPLATE]${c.reset}`;

export default {
  name: 'guildCreate',
  once: false,
  async execute(guild, client) {
    const result = await applyNameStyleToGuild(client, guild.id);

    if (result.ok) {
      console.log(`  ${TAG} ${c.green}OK${c.reset}  ${c.white}${guild.name}${c.muted}  (${guild.id})${c.reset}`);
    } else {
      console.log(`  ${TAG} ${c.yellow}SKIP${c.reset}  ${c.white}${guild.name}${c.muted}  (${result.reason})${c.reset}`);
    }
  },
};
