import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { getLinkedAccount } from '../../utils/panelUsers.js';
import { ephemeral } from '../../utils/ephemeral.js';
import { buildNotRegisteredCard, buildUserInfoCard } from '../shared/userinfo.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder().setName('userinfo').setDescription('View your Pterodactyl panel account status'),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: `${getEmoji('error404')}  This command can only be used in a server.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const avatarUrl = interaction.user.displayAvatarURL({ size: 256, extension: 'png' });
    const account = getLinkedAccount(interaction.guildId, interaction.user.id);

    if (!account) {
      await interaction.reply(ephemeral(buildNotRegisteredCard(interaction.user, avatarUrl)));
      return;
    }

    await interaction.reply(ephemeral(buildUserInfoCard(interaction.user, account, avatarUrl)));
  },
};
