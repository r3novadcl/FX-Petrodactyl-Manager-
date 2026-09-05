import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { setPanelConfig, setScanData, setScanError, validatePanelUrl, validateApiKey } from '../../utils/panel.js';
import { testConnection, scanPanel, PanelApiError } from '../../utils/panelApi.js';
import { buildErrorCard, buildSuccessCard } from '../shared/configure.js';
import { ephemeral } from '../../utils/ephemeral.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('configure')
    .setDescription('Link your Pterodactyl panel URL and API key')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName('panel_link').setDescription('Your Pterodactyl panel URL (e.g. https://panel.example.com)').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('api_key').setDescription('Your Pterodactyl API key (ptla_...)').setRequired(true)
    ),

  async execute(interaction) {
    const panelLink = interaction.options.getString('panel_link').trim();
    const apiKey = interaction.options.getString('api_key').trim();
    const avatarUrl = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });

    const urlCheck = validatePanelUrl(panelLink);
    if (!urlCheck.ok) {
      await interaction.reply(ephemeral(buildErrorCard(urlCheck.reason, avatarUrl)));
      return;
    }

    const keyCheck = validateApiKey(apiKey);
    if (!keyCheck.ok) {
      await interaction.reply(ephemeral(buildErrorCard(keyCheck.reason, avatarUrl)));
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await testConnection(urlCheck.normalized, apiKey);
    } catch (err) {
      const reason =
        err instanceof PanelApiError ? err.message : 'Could not reach the panel — check the URL and that the panel is online.';
      await interaction.editReply(ephemeral(buildErrorCard(reason, avatarUrl)));
      return;
    }

    setPanelConfig(interaction.guildId, {
      panelUrl: urlCheck.normalized,
      apiKey,
      configuredBy: interaction.user.id,
    });

    try {
      const scanResult = await scanPanel(urlCheck.normalized, apiKey);
      setScanData(interaction.guildId, scanResult);
    } catch (err) {
      const reason = err instanceof PanelApiError ? err.message : 'Unexpected error while scanning the panel.';
      setScanError(interaction.guildId, reason);
    }

    await interaction.editReply(ephemeral(buildSuccessCard(avatarUrl)));
  },
};
