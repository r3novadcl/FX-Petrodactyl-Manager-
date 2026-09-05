import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readJson, writeJsonAtomic } from './atomicJson.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../storage/database/panelUsers.json');

// Shape: { [guildId]: { [discordUserId]: { panelUserId, panelUuid, username, email, createdAt, lastPasswordResetAt } } }

function readAll() {
  return readJson(DB_PATH, {});
}

function writeAll(data) {
  writeJsonAtomic(DB_PATH, data);
}

export function getLinkedAccount(guildId, discordUserId) {
  const all = readAll();
  return all[guildId]?.[discordUserId] ?? null;
}

export function linkAccount(guildId, discordUserId, { panelUserId, panelUuid, username, email }) {
  const all = readAll();
  if (!all[guildId]) all[guildId] = {};

  const record = {
    panelUserId,
    panelUuid,
    username,
    email,
    createdAt: Date.now(),
    lastPasswordResetAt: null,
  };

  all[guildId][discordUserId] = record;
  writeAll(all);
  return record;
}

export function findDiscordUserByPanelUserId(guildId, panelUserId) {
  const all = readAll();
  const guildRecords = all[guildId];
  if (!guildRecords) return null;

  for (const [discordUserId, record] of Object.entries(guildRecords)) {
    if (record.panelUserId === panelUserId) {
      return { discordUserId, record };
    }
  }
  return null;
}

export function markPasswordRegenerated(guildId, discordUserId) {
  const all = readAll();
  const record = all[guildId]?.[discordUserId];
  if (!record) return null;

  record.lastPasswordResetAt = Date.now();
  writeAll(all);
  return record;
}
