import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readJson, writeJsonAtomic } from './atomicJson.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../storage/database/panel.json');

const DEFAULT_CONFIG = {
  panelUrl: null,
  apiKey: null,
  configuredAt: null,
  configuredBy: null,
  scanData: null,
  lastScanError: null,
};

function readAll() {
  return readJson(DB_PATH, {});
}

function writeAll(data) {
  writeJsonAtomic(DB_PATH, data);
}

/** Validates a panel URL and returns a normalized origin+path (no trailing slash). */
export function validatePanelUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'Not a valid URL — must look like `https://panel.example.com`.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'URL must use `http://` or `https://`.' };
  }

  const normalized = url.origin + url.pathname.replace(/\/+$/, '');
  return { ok: true, normalized };
}

/** Validates a Pterodactyl API key format (client `ptlc_...` or application `ptla_...`). */
export function validateApiKey(key) {
  if (typeof key !== 'string' || key.trim().length === 0) {
    return { ok: false, reason: 'API key cannot be empty.' };
  }

  if (!/^ptl[ac]_[A-Za-z0-9]+$/.test(key.trim())) {
    return {
      ok: false,
      reason:
        "That doesn't look like a Pterodactyl API key — expected format `ptlc_...` (client) or `ptla_...` (application).",
    };
  }

  return { ok: true };
}

export function getPanelConfig(guildId) {
  const all = readAll();
  return { ...DEFAULT_CONFIG, ...(all[guildId] ?? {}) };
}

export function setPanelConfig(guildId, { panelUrl, apiKey, configuredBy }) {
  const all = readAll();
  const updated = {
    ...DEFAULT_CONFIG,
    ...(all[guildId] ?? {}),
    panelUrl,
    apiKey,
    configuredBy,
    configuredAt: Date.now(),
  };
  all[guildId] = updated;
  writeAll(all);
  return updated;
}

export function clearPanelConfig(guildId) {
  const all = readAll();
  delete all[guildId];
  writeAll(all);
}

export function setScanData(guildId, scanData) {
  const all = readAll();
  const updated = { ...DEFAULT_CONFIG, ...(all[guildId] ?? {}), scanData, lastScanError: null };
  all[guildId] = updated;
  writeAll(all);
  return updated;
}

export function setScanError(guildId, message) {
  const all = readAll();
  const updated = {
    ...DEFAULT_CONFIG,
    ...(all[guildId] ?? {}),
    lastScanError: { message, at: Date.now() },
  };
  all[guildId] = updated;
  writeAll(all);
  return updated;
}
