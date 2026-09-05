import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} from 'discord.js';

import { getEmoji } from '../../utils/emoji.js';
import { BRAND, ACCENT } from '../../utils/constants.js';

function wsStatus(ms) {
  if (ms < 0) return { label: 'Measuring', detail: 'Heartbeat not yet recorded — try again shortly' };
  if (ms < 80) return { label: 'Excellent', detail: 'Sub-80ms — running clean' };
  if (ms < 150) return { label: 'Good', detail: 'Solid connection, smooth operation' };
  if (ms < 250) return { label: 'Moderate', detail: 'Minor lag detected — monitoring' };
  return { label: 'Degraded', detail: 'Elevated latency — possible hiccup' };
}

function bar(ms) {
  if (ms < 0) return '`' + '░'.repeat(5) + '`';
  const filled = Math.min(Math.round(ms / 60), 5);
  const empty = 5 - filled;
  return '`' + '█'.repeat(filled) + '░'.repeat(empty) + '`';
}

/** Builds the ping report card. Used identically by /ping and ,,ping. */
export function buildPingCard(wsMs, restMs, avatarUrl) {
  const { label, detail } = wsStatus(wsMs);
  const container = new ContainerBuilder().setAccentColor(ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${getEmoji('network')}  Latency Report\n-# **${label}** — ${detail}`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${getEmoji('scan')}  **WebSocket**  \`${wsMs}ms\`  ${bar(wsMs)}`,
        `${getEmoji('reclaim')}  **REST Round-Trip**  \`${restMs}ms\``,
      ].join('\n')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  const footer =
    wsMs < 0
      ? `${getEmoji('infocircle')}  WebSocket still warming up`
      : wsMs < 150
        ? `${getEmoji('yes')}  All systems operational`
        : wsMs < 250
          ? `${getEmoji('error404')}  Slight delay — not critical`
          : `${getEmoji('no')}  Latency elevated — monitor closely`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}  ·  ${BRAND}`));

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
