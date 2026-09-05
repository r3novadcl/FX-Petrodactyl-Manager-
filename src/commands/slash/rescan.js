import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { getPanelConfig } from '../../utils/panel.js';
import { ephemeral } from '../../utils/ephemeral.js';
import { buildNotConfiguredCard, performRescan } from '../shared/rescan.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('rescan')
    .setDescription('Re-sync the linked Pterodactyl panel')
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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const payload = await performRescan(interaction.guildId, avatarUrl);
    await interaction.editReply(ephemeral(payload));
  },
};
