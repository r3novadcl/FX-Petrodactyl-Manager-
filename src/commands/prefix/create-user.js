import { PREFIX } from '../../utils/config.js';
import { getEmoji } from '../../utils/emoji.js';
import { runCreateUser } from '../shared/create-user.js';

export default {
  cooldown: 10,
  prefix: 'create-user',

  async prefixExecute(message, args, client) {
    const [username, email, password] = args;
    if (!username || !email || !password) {
      await message.reply(`${getEmoji('infocircle')}  Usage: \`${PREFIX}create-user <username> <email> <password>\``);
      return;
    }

    // The password was just typed in plain chat — delete it immediately if we can.
    await message.delete().catch(() => {});

    const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });

    const payload = await runCreateUser(message.author, {
      guildId: message.guildId,
      username: username.trim(),
      email: email.trim(),
      password,
      avatarUrl,
    });

    await message.channel.send({ content: `${message.author}`, ...payload });
  },
};
