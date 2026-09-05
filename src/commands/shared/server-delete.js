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
  StringSelectMenuBuilder,
  MessageFlags,
} from 'discord.js';

import { getEmoji } from '../../utils/emoji.js';

const PANEL_ACCENT = 0xffffff;
const MAX_OPTIONS = 25; // Discord's select-menu option cap

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

export function buildNoDataCard(avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${getEmoji('error404')}  No Scan Data\n-# Run \`/rescan\` to pull the server list first.`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildNoServersCard(avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${getEmoji('infocircle')}  No Servers Found\n-# The panel has no servers to delete.`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildServerPickerCard(scanData, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${getEmoji('error404')}  Delete a Server\n-# Select a server below — this cannot be undone.`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  const eggNameById = new Map(scanData.eggs.map((egg) => [egg.id, egg.name]));
  const servers = scanData.servers.slice(0, MAX_OPTIONS);
  const options = servers.map((server) => ({
    label: server.name.slice(0, 100),
    description: `Egg: ${eggNameById.get(server.eggId) ?? 'Unknown'}`.slice(0, 100),
    value: String(server.id),
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('serverdelete_select')
    .setPlaceholder('Choose a server to delete…')
    .addOptions(options);

  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));

  if (scanData.servers.length > MAX_OPTIONS) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${getEmoji('infocircle')}  Showing first ${MAX_OPTIONS} of ${scanData.servers.length} servers.`
      )
    );
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildConfirmCard(server, eggName, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('error404')}  Confirm Deletion`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [`**Server:** ${server.name}`, `**Egg:** ${eggName}`, `**ID:** ${server.id}`].join('\n')
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${getEmoji('error404')}  **All data on this server will be permanently lost.**`,
        'We strongly recommend taking a backup from the panel before continuing.',
        "If you already have a backup, click **Next** to proceed to final confirmation.",
      ].join('\n')
    )
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('serverdelete_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`serverdelete_next_${server.id}`).setLabel('Next').setStyle(ButtonStyle.Primary)
    )
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildFinalConfirmCard(server, eggName, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('error404')}  Final Confirmation`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [`**Server:** ${server.name}`, `**Egg:** ${eggName}`, `**ID:** ${server.id}`].join('\n')
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${getEmoji('error404')}  This action is irreversible. Click **Delete Server** to permanently delete it now.`
    )
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('serverdelete_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`serverdelete_confirm_${server.id}`).setLabel('Delete Server').setStyle(ButtonStyle.Danger)
    )
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/** Generic result card, reused for both success and failure outcomes. */
export function buildResultCard(title, description, success, avatarUrl, deletedByUserId = null) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji(success ? 'yes' : 'error404')}  ${title}\n-# ${description}`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );

  if (success && deletedByUserId) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Deleted by <@${deletedByUserId}>`));
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
