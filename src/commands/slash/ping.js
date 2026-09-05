import { SlashCommandBuilder } from 'discord.js';
import { buildPingCard } from '../shared/ping.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),

  async execute(interaction) {
    const wsMs = interaction.client.ws.ping;
    const started = Date.now();
    await interaction.deferReply();
    const restMs = Date.now() - started;
    const avatarUrl = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });
    await interaction.editReply(buildPingCard(wsMs, restMs, avatarUrl));
  },
};
