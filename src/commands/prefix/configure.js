import { PermissionFlagsBits } from 'discord.js';
import { PREFIX } from '../../utils/config.js';
import { getEmoji } from '../../utils/emoji.js';
import { setPanelConfig, setScanData, setScanError, validatePanelUrl, validateApiKey } from '../../utils/panel.js';
import { testConnection, scanPanel, PanelApiError } from '../../utils/panelApi.js';
import { buildErrorCard, buildSuccessCard } from '../shared/configure.js';

export default {
  cooldown: 5,
  prefix: 'configure',

  async prefixExecute(message, args, client) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply(`${getEmoji('error404')}  Only administrators can use this command.`);
      return;
    }

    const [panelLink, apiKey] = args;
    if (!panelLink || !apiKey) {
      await message.reply(`${getEmoji('infocircle')}  Usage: \`${PREFIX}configure <panel_url> <api_key>\``);
      return;
    }

    const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });

    const urlCheck = validatePanelUrl(panelLink);
    if (!urlCheck.ok) {
      await message.reply(buildErrorCard(urlCheck.reason, avatarUrl));
      return;
    }

    const keyCheck = validateApiKey(apiKey);
    if (!keyCheck.ok) {
      await message.reply(buildErrorCard(keyCheck.reason, avatarUrl));
      return;
    }

    const sent = await message.reply(`${getEmoji('scan')}  Testing connection...`);

    try {
      await testConnection(urlCheck.normalized, apiKey);
    } catch (err) {
      const reason =
        err instanceof PanelApiError ? err.message : 'Could not reach the panel — check the URL and that the panel is online.';
      await sent.edit(buildErrorCard(reason, avatarUrl));
      return;
    }

    setPanelConfig(message.guildId, { panelUrl: urlCheck.normalized, apiKey, configuredBy: message.author.id });

    try {
      const scanResult = await scanPanel(urlCheck.normalized, apiKey);
      setScanData(message.guildId, scanResult);
    } catch (err) {
      const reason = err instanceof PanelApiError ? err.message : 'Unexpected error while scanning the panel.';
      setScanError(message.guildId, reason);
    }

    await sent.edit(buildSuccessCard(avatarUrl));
  },
};
