import { SlashCommandBuilder } from 'discord.js';
import { buildHelpMessage } from '../shared/help.js';

export default {
  data: new SlashCommandBuilder().setName('help').setDescription('Interactive command reference'),

  async execute(interaction) {
    await interaction.reply(buildHelpMessage(interaction.user, interaction.client));
  },
};
