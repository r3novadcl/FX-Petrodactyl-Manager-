import { randomInt } from 'crypto';

// Character sets deliberately exclude visually-ambiguous characters
// (no I/O/l/0/1) so generated passwords are easy to read back to a user.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGIT = '23456789';
const SYMBOL = '!@#$%^&*-_+=';

/**
 * Generates a cryptographically-random password.
 * Guarantees at least one character from each of the four pools,
 * then fills the rest randomly and shuffles (Fisher-Yates).
 */
export function generatePassword(length = 16) {
  const pools = [UPPER, LOWER, DIGIT, SYMBOL];
  const allChars = pools.join('');

  const chars = pools.map((pool) => pool[randomInt(pool.length)]);

  while (chars.length < length) {
    chars.push(allChars[randomInt(allChars.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
