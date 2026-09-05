import { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';
import { getEmoji } from '../../utils/emoji.js';
import { getPanelConfig, setScanData, setScanError } from '../../utils/panel.js';
import { scanPanel, PanelApiError } from '../../utils/panelApi.js';
import { buildPanelDetailCard } from './configure.js';

const PANEL_ACCENT = 0xffffff;

export function buildNotConfiguredCard(avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji('error404')}  Panel Not Configured\n-# Run \`/configure\` first.`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildErrorCard(reason, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji('error404')}  Rescan Failed\n-# ${reason}`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/** Re-syncs the panel and returns the reply payload (success detail card or failure card). Call after deferring. */
export async function performRescan(guildId, avatarUrl) {
  const panelConfig = getPanelConfig(guildId);
  try {
    const scanResult = await scanPanel(panelConfig.panelUrl, panelConfig.apiKey);
    const updated = setScanData(guildId, scanResult);
    return buildPanelDetailCard(updated, avatarUrl);
  } catch (err) {
    const reason = err instanceof PanelApiError ? err.message : 'Unexpected error while scanning the panel.';
    setScanError(guildId, reason);
    return buildErrorCard(reason, avatarUrl);
  }
}
