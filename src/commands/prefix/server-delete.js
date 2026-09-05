import { PermissionFlagsBits } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { getPanelConfig } from '../../utils/panel.js';
import { buildNotConfiguredCard, buildNoDataCard, buildNoServersCard, buildServerPickerCard } from '../shared/server-delete.js';

export default {
  cooldown: 5,
  prefix: 'server-delete',

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
    if (!panelConfig.scanData) {
      await message.reply(buildNoDataCard(avatarUrl));
      return;
    }
    if (!panelConfig.scanData.servers.length) {
      await message.reply(buildNoServersCard(avatarUrl));
      return;
    }

    await message.reply(buildServerPickerCard(panelConfig.scanData, avatarUrl));
  },
};
