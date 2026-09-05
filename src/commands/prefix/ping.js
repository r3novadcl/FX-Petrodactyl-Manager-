import { buildPingCard } from '../shared/ping.js';

export default {
  cooldown: 5,
  prefix: 'ping',

  async prefixExecute(message, args, client) {
    const wsMs = client.ws.ping;
    const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });
    const started = Date.now();
    const sent = await message.reply(buildPingCard(wsMs, 0, avatarUrl));
    const restMs = Date.now() - started;
    await sent.edit(buildPingCard(wsMs, restMs, avatarUrl));
  },
};
