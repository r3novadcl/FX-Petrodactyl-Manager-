import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { getPanelConfig } from '../../utils/panel.js';
import { ephemeral } from '../../utils/ephemeral.js';
import { sessions, SESSION_TTL_MS, buildNotConfiguredCard, buildNoDataCard, buildNodePickerCard } from '../shared/create-server.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('create-server')
    .setDescription('Create a new server on the linked Pterodactyl panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((opt) => opt.setName('ram').setDescription('RAM in MB (0 = unlimited)').setMinValue(0).setRequired(true))
    .addIntegerOption((opt) => opt.setName('cpu').setDescription('CPU % limit (0 = unlimited)').setMinValue(0).setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('storage').setDescription('Disk storage in MB (0 = unlimited)').setMinValue(0).setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('backups').setDescription('Number of backup slots (default 0 = none)').setMinValue(0).setRequired(false)
    ),

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
    if (!panelConfig.scanData || !panelConfig.scanData.nodes.length || !panelConfig.scanData.eggs.length) {
      await interaction.reply(ephemeral(buildNoDataCard(avatarUrl)));
      return;
    }

    const ram = interaction.options.getInteger('ram');
    const cpu = interaction.options.getInteger('cpu');
    const storage = interaction.options.getInteger('storage');
    const backups = interaction.options.getInteger('backups') ?? 0;

    await interaction.reply(ephemeral(buildNodePickerCard(panelConfig.scanData, avatarUrl)));
    const sent = await interaction.fetchReply();

    const session = {
      guildId: interaction.guildId,
      userId: interaction.user.id,
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
