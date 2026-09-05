import { PermissionFlagsBits } from 'discord.js';
import { PREFIX } from '../../utils/config.js';
import { getEmoji } from '../../utils/emoji.js';
import { getPanelConfig } from '../../utils/panel.js';
import { sessions, SESSION_TTL_MS, buildNotConfiguredCard, buildNoDataCard, buildNodePickerCard } from '../shared/create-server.js';

export default {
  cooldown: 5,
  prefix: 'create-server',

  async prefixExecute(message, args, client) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply(`${getEmoji('error404')}  Only administrators can use this command.`);
      return;
    }

    const [ramArg, cpuArg, storageArg, backupsArg] = args;
    const ram = Number(ramArg);
    const cpu = Number(cpuArg);
    const storage = Number(storageArg);
    const backups = backupsArg !== undefined ? Number(backupsArg) : 0;

    if (![ram, cpu, storage, backups].every((n) => Number.isInteger(n) && n >= 0)) {
      await message.reply(
        `${getEmoji('infocircle')}  Usage: \`${PREFIX}create-server <ram_mb> <cpu_percent> <storage_mb> [backups]\` (use \`0\` for unlimited)`
      );
      return;
    }

    const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });
    const panelConfig = getPanelConfig(message.guildId);

    if (!panelConfig.panelUrl || !panelConfig.apiKey) {
      await message.reply(buildNotConfiguredCard(avatarUrl));
      return;
    }
    if (!panelConfig.scanData || !panelConfig.scanData.nodes.length || !panelConfig.scanData.eggs.length) {
      await message.reply(buildNoDataCard(avatarUrl));
      return;
    }

    const sent = await message.reply(buildNodePickerCard(panelConfig.scanData, avatarUrl));

    const session = {
      guildId: message.guildId,
      userId: message.author.id,
      ram,
      cpu,
      disk: storage,
      backups,
      nodeId: null,
      eggId: null,
      ownerId: null,
    };
    sessions.set(sent.id, session);
    setTimeout(() => sessions.delete(sent.id), SESSION_TTL_MS);
  },
};
