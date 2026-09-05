import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname } from 'path';

/** Makes sure the parent directory of a file path exists. */
export function ensureFileDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Reads a JSON file, creating it with `fallback` content if it doesn't
 * exist yet. Returns `fallback` (cloned) if the file is missing or corrupt.
 */
export function readJson(filePath, fallback = {}) {
  ensureFileDir(filePath);

  if (!existsSync(filePath)) {
    writeJsonAtomic(filePath, fallback);
    return structuredClone(fallback);
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

/**
 * Writes JSON to disk atomically: writes to a temp file first, then
 * renames it over the target so readers never see a half-written file.
 */
export function writeJsonAtomic(filePath, data, indent = 2) {
  ensureFileDir(filePath);

  const tmpPath = `${filePath}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;

  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, indent), 'utf8');
    renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      // best-effort cleanup only
    }
    throw err;
  }
}
