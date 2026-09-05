import { MessageFlags } from 'discord.js';

/** Adds the Ephemeral flag to a { components, flags } payload. Interaction replies only. */
export function ephemeral(payload) {
  return { ...payload, flags: payload.flags | MessageFlags.Ephemeral };
}
