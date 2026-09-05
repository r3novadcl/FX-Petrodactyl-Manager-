import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeJsonAtomic } from './atomicJson.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMOJI_PATH = join(__dirname, '../../storage/emoji.json');

let _cache = null;

function loadCache() {
  try {
    _cache = JSON.parse(readFileSync(EMOJI_PATH, 'utf8'));
  } catch {
    _cache = {};
  }
}

export function reloadEmojiCache() {
  loadCache();
}

export function getEmoji(name) {
  if (_cache === null) loadCache();
  return _cache[name] ?? '';
}

export function getAllEmojis() {
  if (_cache === null) loadCache();
  return { ..._cache };
}

export function setEmoji(name, value) {
  try {
    if (_cache === null) loadCache();
    _cache[name] = value;
    writeJsonAtomic(EMOJI_PATH, _cache, 2);
    return true;
  } catch {
    return false;
  }
}
