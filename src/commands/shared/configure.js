import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';

import { getEmoji } from '../../utils/emoji.js';
import { BRAND } from '../../utils/constants.js';

const PANEL_ACCENT = 0xffffff;

export function buildErrorCard(reason, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji('error404')}  Invalid Input\n-# ${reason}`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildSuccessCard(avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('yes')}  Configure Successful`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_view_details')
        .setLabel('Configuration')
        .setEmoji(getEmoji('setting') || '⚙️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_rescan')
        .setLabel('Verification')
        .setEmoji(getEmoji('scan') || '🔄')
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/** Shows the currently-linked panel URL/key and (if scanned) a summary of inventory counts. */
export function buildPanelDetailCard(panelConfig, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('setting')}  Panel Configuration`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  const scanData = panelConfig.scanData;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [`**URL:** ${panelConfig.panelUrl ?? '—'}`, `**Key:** ||${panelConfig.apiKey ?? '—'}||`].join('\n')
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  if (scanData) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**Servers:** ${scanData.servers.length}  ·  **Nodes:** ${scanData.nodes.length}`,
          `**Nests:** ${scanData.nests.length}  ·  **Eggs:** ${scanData.eggs.length}  ·  **Users:** ${scanData.users.length}`,
        ].join('\n')
      )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${getEmoji('error404')}  No sync data yet — tap **Verification** to rescan.`)
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${BRAND}`));

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
