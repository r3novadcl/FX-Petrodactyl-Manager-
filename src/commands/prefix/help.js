import { buildHelpMessage } from '../shared/help.js';

export default {
  prefix: 'help',

  async prefixExecute(message, args, client) {
    await message.reply(buildHelpMessage(message.author, client));
  },
};
