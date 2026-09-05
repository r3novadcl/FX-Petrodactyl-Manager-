// Small ANSI color helper used for console/log output only.
// (Does not affect anything sent to Discord — just terminal styling.)

export const c = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',

  c1: '\u001b[38;5;27m',
  c2: '\u001b[38;5;33m',
  c3: '\u001b[38;5;39m',
  c4: '\u001b[38;5;45m',
  c5: '\u001b[38;5;51m',
  c6: '\u001b[38;5;87m',

  white: '\u001b[97m',
  muted: '\u001b[38;5;245m',
  red: '\u001b[91m',
  green: '\u001b[38;5;48m',
  yellow: '\u001b[38;5;220m',
};

export const RULE = `${c.muted}${'-'.repeat(48)}${c.reset}`;
