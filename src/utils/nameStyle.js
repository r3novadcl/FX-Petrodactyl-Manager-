import { REST } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';

// Discord's display-name font/effect ids currently run 1-12 and 1-6.
const FONT_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const EFFECT_IDS = new Set([1, 2, 3, 4, 5, 6]);
const GRADIENT_EFFECT_ID = 2;

// Default styling applied to the bot's own display name in each guild.
// fontId/effectId/hexColors are freely adjustable.
export const NAME_STYLE = {
  fontId: 4,
  effectId: 4,
  hexColors: ['#808080'],
};

function hexToInt(hex) {
  return parseInt(hex.replace(/^#/, ''), 16);
}

function isValidColor(n) {
  return Number.isInteger(n) && n >= 0 && n <= 0xffffff;
}

/**
 * Applies NAME_STYLE to the bot's own member profile in a single guild via
 * `PATCH /guilds/{id}/members/@me`. Returns { guildId, ok, reason? }.
 */
export async function applyNameStyleToGuild(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { guildId, ok: false, reason: 'guild not cached' };

  let botMember = guild.members.me;
  if (!botMember) {
    try {
      botMember = await guild.members.fetchMe();
    } catch {
      return { guildId, ok: false, reason: 'bot member not resolvable' };
    }
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ChangeNickname)) {
    return { guildId, ok: false, reason: 'missing Change Nickname permission' };
  }

  if (!FONT_IDS.has(NAME_STYLE.fontId) || !EFFECT_IDS.has(NAME_STYLE.effectId)) {
    return { guildId, ok: false, reason: 'invalid font/effect id in config' };
  }

  const colors = NAME_STYLE.hexColors.map(hexToInt);
  if (!colors.length || colors.length > 2 || !colors.every(isValidColor)) {
    return { guildId, ok: false, reason: 'invalid color config' };
  }
  if (NAME_STYLE.effectId === GRADIENT_EFFECT_ID && colors.length < 2) {
    return { guildId, ok: false, reason: 'gradient effect requires 2 colors' };
  }

  const rest = new REST({ version: '10' }).setToken(client.token);

  try {
    await rest.patch(`/guilds/${guildId}/members/@me`, {
      body: {
        display_name_font_id: NAME_STYLE.fontId,
        display_name_effect_id: NAME_STYLE.effectId,
        display_name_colors: colors,
      },
    });
    return { guildId, ok: true };
  } catch (err) {
    const reason = err?.rawError?.message ?? err?.message ?? 'unknown error';
    return { guildId, ok: false, reason };
  }
}

/** Applies NAME_STYLE across every guild the bot is currently in, rate-limit friendly. */
export async function applyNameStyleToAllGuilds(client) {
  const guildIds = [...client.guilds.cache.keys()];
  const results = [];

  for (const guildId of guildIds) {
    results.push(await applyNameStyleToGuild(client, guildId));
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const ok = results.filter((r) => r.ok).length;
  return { ok, failed: results.length - ok, results };
}
