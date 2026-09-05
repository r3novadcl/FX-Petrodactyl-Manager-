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

const PANEL_ACCENT = 0xffffff;

export function buildNotRegisteredCard(discordUser, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji('profilecircle')}  ${discordUser.username}`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${getEmoji('error404')}  Not registered — run \`/create-user\` to create a panel account.`
    )
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildUserInfoCard(discordUser, account, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${getEmoji('profilecircle')}  ${discordUser.username}`)
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${getEmoji('yes')}  **Registered**`,
        `**Username:** ${account.username}`,
        `**User ID:** ${discordUser.id}`,
      ].join('\n')
    )
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`userinfo_email_${discordUser.id}`)
        .setLabel('Email')
        .setEmoji(getEmoji('chat') || '📧')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`userinfo_regen_${discordUser.id}`)
        .setLabel('Regenerate Password')
        .setEmoji(getEmoji('security') || '🔐')
        .setStyle(ButtonStyle.Secondary)
    )
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
