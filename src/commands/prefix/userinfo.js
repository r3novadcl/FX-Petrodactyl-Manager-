import { getLinkedAccount } from '../../utils/panelUsers.js';
import { buildNotRegisteredCard, buildUserInfoCard } from '../shared/userinfo.js';

export default {
  cooldown: 5,
  prefix: 'userinfo',

  async prefixExecute(message) {
    const avatarUrl = message.author.displayAvatarURL({ size: 256, extension: 'png' });
    const account = getLinkedAccount(message.guildId, message.author.id);

    if (!account) {
      await message.reply(buildNotRegisteredCard(message.author, avatarUrl));
      return;
    }

    await message.reply(buildUserInfoCard(message.author, account, avatarUrl));
  },
};
