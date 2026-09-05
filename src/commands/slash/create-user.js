import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { ephemeral } from '../../utils/ephemeral.js';
import { runCreateUser } from '../shared/create-user.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('create-user')
    .setDescription('Create your Pterodactyl panel account')
    .addStringOption((opt) => opt.setName('username').setDescription('Panel username').setRequired(true))
    .addStringOption((opt) => opt.setName('email').setDescription('Panel account email').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('password').setDescription('Panel account password (min 8 characters)').setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: `${getEmoji('error404')}  This command can only be used in a server.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const avatarUrl = interaction.client.user.displayAvatarURL({ size: 256, extension: 'png' });
    const username = interaction.options.getString('username').trim();
    const email = interaction.options.getString('email').trim();
    const password = interaction.options.getString('password');

    const payload = await runCreateUser(interaction.user, {
      guildId: interaction.guildId,
      username,
      email,
      password,
      avatarUrl,
    });

    await interaction.editReply(payload);
  },
};
