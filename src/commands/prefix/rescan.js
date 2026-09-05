import { PermissionFlagsBits } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { getPanelConfig } from '../../utils/panel.js';
import { buildNotConfiguredCard, performRescan } from '../shared/rescan.js';

export default {
  cooldown: 10,
  prefix: 'rescan',

  async prefixExecute(message, args, client) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply(`${getEmoji('error404')}  Only administrators can use this command.`);
      return;
    }

    const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });
    const panelConfig = getPanelConfig(message.guildId);

    if (!panelConfig.panelUrl || !panelConfig.apiKey) {
      await message.reply(buildNotConfiguredCard(avatarUrl));
      return;
    }

    const sent = await message.reply(`${getEmoji('scan')}  Rescanning panel...`);
    const payload = await performRescan(message.guildId, avatarUrl);
    await sent.edit(payload);
  },
};
