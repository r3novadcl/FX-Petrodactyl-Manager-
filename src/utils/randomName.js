const ADJECTIVES = [
  'swift', 'crimson', 'lunar', 'silent', 'iron', 'azure', 'shadow', 'rapid',
  'frozen', 'blazing', 'hidden', 'cosmic', 'golden', 'quantum', 'stormy', 'arctic',
];

const NOUNS = [
  'falcon', 'nexus', 'phoenix', 'server', 'node', 'comet', 'wolf', 'vector',
  'reactor', 'beacon', 'forge', 'raptor', 'titan', 'orbit', 'cipher', 'pulse',
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Generates a name like "swift-node-a3f9" for auto-created servers. */
export function generateServerName() {
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${suffix}`;
}
