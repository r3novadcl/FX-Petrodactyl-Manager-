import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { getPanelConfig } from '../../utils/panel.js';
import { ephemeral } from '../../utils/ephemeral.js';
import { buildNotConfiguredCard, buildNoDataCard, buildNoServersCard, buildServerPickerCard } from '../shared/server-delete.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('server-delete')
    .setDescription('Delete a server from the linked Pterodactyl panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: `${getEmoji('error404')}  This command can only be used in a server.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const avatarUrl = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });
    const panelConfig = getPanelConfig(interaction.guildId);

    if (!panelConfig.panelUrl || !panelConfig.apiKey) {
      await interaction.reply(ephemeral(buildNotConfiguredCard(avatarUrl)));
      return;
    }
    if (!panelConfig.scanData) {
      await interaction.reply(ephemeral(buildNoDataCard(avatarUrl)));
      return;
    }
    if (!panelConfig.scanData.servers.length) {
      await interaction.reply(ephemeral(buildNoServersCard(avatarUrl)));
      return;
    }

    await interaction.reply(ephemeral(buildServerPickerCard(panelConfig.scanData, avatarUrl)));
  },
};
