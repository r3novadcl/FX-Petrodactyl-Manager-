const cooldowns = new Map();

// Periodically purge expired entries so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of cooldowns) {
    if (expiresAt <= now) cooldowns.delete(key);
  }
}, 10 * 60 * 1000).unref();

/** Returns remaining cooldown time in ms for a user+command pair, or 0. */
export function getRemainingCooldown(userId, commandName) {
  const key = `${userId}:${commandName}`;
  const expiresAt = cooldowns.get(key);
  if (!expiresAt) return 0;

  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    cooldowns.delete(key);
    return 0;
  }
  return remaining;
}

/** Starts a cooldown of `seconds` for a user+command pair. */
export function triggerCooldown(userId, commandName, seconds) {
  if (!seconds || seconds <= 0) return;
  const key = `${userId}:${commandName}`;
  cooldowns.set(key, Date.now() + seconds * 1000);
}

/** Formats a millisecond duration as e.g. "3.2s". */
export function formatCooldown(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
