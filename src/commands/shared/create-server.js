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
const MAX_OPTIONS = 25;

/** In-memory wizard state, keyed by the wizard message's id. Expires after 10 minutes. */
export const sessions = new Map();
export const SESSION_TTL_MS = 10 * 60 * 1000;

function fmtMiB(value) {
  if (!value) return 'Unlimited';
  if (value >= 1024) return (value / 1024).toFixed(1) + ' GB';
  return value + ' MB';
}

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
          `### ${getEmoji('error404')}  No Scan Data\n-# Run \`/rescan\` to pull the panel inventory first.`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildErrorCard(title, description, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('error404')}  ${title}\n-# ${description}`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildResultCard(title, description, success, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji(success ? 'yes' : 'error404')}  ${title}\n-# ${description}`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildNodePickerCard(scanData, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji('network')}  Create Server — Step 1/3\n-# Choose a node to deploy on.`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  const nodes = scanData.nodes.slice(0, MAX_OPTIONS);
  const options = nodes.map((node) => ({
    label: node.name.slice(0, 100),
    // Note: this is the node's total configured RAM/disk, not live-free capacity —
    // the panel API doesn't expose per-node free memory/disk, only free network allocations.
    description: `${node.locationName ?? 'Unknown location'} · RAM: ${fmtMiB(node.memory)} · Disk: ${fmtMiB(node.disk)}`.slice(0, 100),
    value: String(node.id),
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('createserver_node_select')
    .setPlaceholder('Choose a node…')
    .addOptions(options);

  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));

  if (scanData.nodes.length > MAX_OPTIONS) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${getEmoji('infocircle')}  Showing first ${MAX_OPTIONS} of ${scanData.nodes.length} nodes.`
      )
    );
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildEggPickerCard(scanData, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji('scan')}  Create Server — Step 2/3\n-# Choose an egg (server type).`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  const nestNameById = new Map(scanData.nests.map((nest) => [nest.id, nest.name]));
  const eggs = scanData.eggs.slice(0, MAX_OPTIONS);
  const options = eggs.map((egg) => ({
    label: egg.name.slice(0, 100),
    description: `Nest: ${nestNameById.get(egg.nestId) ?? 'Unknown'}`.slice(0, 100),
    value: String(egg.id),
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('createserver_egg_select')
    .setPlaceholder('Choose an egg…')
    .addOptions(options);

  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));

  if (scanData.eggs.length > MAX_OPTIONS) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${getEmoji('infocircle')}  Showing first ${MAX_OPTIONS} of ${scanData.eggs.length} eggs.`
      )
    );
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildUserPickerCard(scanData, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${getEmoji('adduser')}  Create Server — Step 3/3\n-# Choose the server owner (panel account).`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  const users = scanData.users.slice(0, MAX_OPTIONS);
  const options = users.map((user) => ({
    label: user.username.slice(0, 100),
    description: user.email.slice(0, 100),
    value: String(user.id),
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('createserver_user_select')
    .setPlaceholder('Choose the owner…')
    .addOptions(options);

  container.addActionRowComponents(new ActionRowBuilder().addComponents(select));

  if (scanData.users.length > MAX_OPTIONS) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${getEmoji('infocircle')}  Showing first ${MAX_OPTIONS} of ${scanData.users.length} users.`
      )
    );
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildConfirmCard(session, node, egg, user, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('yes')}  Confirm Server Creation`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Node:** ${node.name}`,
        `**Egg:** ${egg.name}`,
        `**Owner:** ${user.username} (${user.email})`,
        `**RAM:** ${session.ram === 0 ? 'Unlimited' : session.ram + ' MB'}`,
        `**CPU:** ${session.cpu === 0 ? 'Unlimited' : session.cpu + '%'}`,
        `**Storage:** ${session.disk === 0 ? 'Unlimited' : session.disk + ' MB'}`,
        `**Backups:** ${session.backups === 0 ? 'None (disabled)' : session.backups}`,
      ].join('\n')
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${getEmoji('infocircle')}  Server name will be generated automatically. Docker image and startup command use the egg's defaults.`
    )
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('createserver_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('createserver_confirm').setLabel('Create Server').setStyle(ButtonStyle.Success)
    )
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
