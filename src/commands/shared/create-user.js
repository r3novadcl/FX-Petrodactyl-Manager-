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
import { getPanelConfig } from '../../utils/panel.js';
import { getLinkedAccount, linkAccount } from '../../utils/panelUsers.js';
import { createPanelUser, PanelApiError } from '../../utils/panelApi.js';

const PANEL_ACCENT = 0xffffff;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Guards against a user double-submitting /create-user (or ,,create-user) before the first finishes.
const inFlight = new Set();

export function buildErrorCard(title, description, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('error404')}  ${title}\n-# ${description}`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildSuccessCard(account, avatarUrl, dmSent) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('yes')}  Account Created`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [`**Username:** ${account.username}`, `**Email:** ${account.email}`].join('\n')
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      dmSent
        ? `-# ${getEmoji('infocircle')}  Full login details (including your password) were sent to your DMs.`
        : `-# ${getEmoji('error404')}  Couldn't DM you — enable DMs from server members to receive your password.`
    )
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildDmCard(account, password, panelUrl, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('security')}  Your Panel Account`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Panel:** ${panelUrl}`,
        `**Username:** ${account.username}`,
        `**Email:** ${account.email}`,
        `**Password:** ||${password}||`,
      ].join('\n')
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${getEmoji('infocircle')}  Keep this message private. Change your password after logging in.`
    )
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/**
 * Full validate -> create -> link -> DM flow, shared by the slash and prefix commands.
 * `discordUser` must be a discord.js User (works for both interaction.user and message.author).
 * Returns the { components, flags } payload to send as the reply.
 */
export async function runCreateUser(discordUser, { guildId, username, email, password, avatarUrl }) {
  const lockKey = `${guildId}:${discordUser.id}`;

  if (inFlight.has(lockKey)) {
    return buildErrorCard('Already Processing', 'Your previous `/create-user` request is still running — please wait.', avatarUrl);
  }
  inFlight.add(lockKey);

  try {
    const panelConfig = getPanelConfig(guildId);
    if (!panelConfig.panelUrl || !panelConfig.apiKey) {
      return buildErrorCard('Panel Not Configured', 'Ask an admin to run `/configure` first.', avatarUrl);
    }

    const existing = getLinkedAccount(guildId, discordUser.id);
    if (existing) {
      return buildErrorCard(
        'Account Already Exists',
        `You've already created a panel account (**${existing.username}**). Only one account per user is allowed.`,
        avatarUrl
      );
    }

    if (username.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return buildErrorCard('Invalid Username', 'Must be 3+ characters, letters/numbers/._- only.', avatarUrl);
    }
    if (!EMAIL_RE.test(email)) {
      return buildErrorCard('Invalid Email', 'Enter a valid email address.', avatarUrl);
    }
    if (password.length < 8) {
      return buildErrorCard('Weak Password', 'Password must be at least 8 characters.', avatarUrl);
    }

    let created;
    try {
      created = await createPanelUser(panelConfig.panelUrl, panelConfig.apiKey, { username, email, password });
    } catch (err) {
      const reason = err instanceof PanelApiError ? err.message : 'Unexpected error while creating the account.';
      return buildErrorCard('Creation Failed', reason, avatarUrl);
    }

    const linked = linkAccount(guildId, discordUser.id, {
      panelUserId: created.id,
      panelUuid: created.uuid,
      username: created.username,
      email: created.email,
    });

    let dmSent = false;
    try {
      await discordUser.send(buildDmCard(linked, password, panelConfig.panelUrl, avatarUrl));
      dmSent = true;
    } catch {
      dmSent = false;
    }

    return buildSuccessCard(linked, avatarUrl, dmSent);
  } finally {
    inFlight.delete(lockKey);
  }
}
