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
import { BRAND, BRAND_LINK, ACCENT } from '../../utils/constants.js';
import { PREFIX } from '../../utils/config.js';

function buildOverview(discordUser, client) {
  const avatarUrl = discordUser.displayAvatarURL({ size: 256, extension: 'png' });
  const guildCount = client.guilds.cache.size;

  const container = new ContainerBuilder().setAccentColor(ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${getEmoji('firstlinehelpmenu')}  Command Centre\n-# Welcome, **${discordUser.username}** — here's what's available`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${getEmoji('firstlinehelpmenu')}  \`/help\`  \`${PREFIX}help\``,
        "> Shows this interactive command reference.",
        '',
        `${getEmoji('network')}  \`/ping\`  \`${PREFIX}ping\``,
        '> Check bot latency — WebSocket & REST round-trip.',
        '',
        `${getEmoji('setting')}  \`/configure\`  **(Admin)**`,
        "> Link your Pterodactyl panel URL and API key.",
        '',
        `${getEmoji('scan')}  \`/rescan\`  **(Admin)**`,
        '> Re-sync the linked Pterodactyl panel.',
        '',
        `${getEmoji('network')}  \`/create-server\`  **(Admin)**`,
        '> Deploy a new server on the linked panel.',
        '',
        `${getEmoji('error404')}  \`/server-delete\`  **(Admin)**`,
        '> Delete a server from the linked panel.',
        '',
        `${getEmoji('adduser')}  \`/create-user\``,
        '> Create your own Pterodactyl panel account.',
        '',
        `${getEmoji('profilecircle')}  \`/userinfo\``,
        '> View your panel registration status.',
      ].join('\n')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${getEmoji('infocircle')}  Slash prefix: \`/\`  ·  Message prefix: \`${PREFIX}\``,
        `-# ${getEmoji('star')}  Active in **${guildCount}** server${guildCount !== 1 ? 's' : ''}  ·  ${BRAND}`,
      ].join('\n')
    )
  );

  return container;
}

function buildNavButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Support Server').setURL(BRAND_LINK).setStyle(ButtonStyle.Link)
  );
}

export function buildHelpMessage(discordUser, client) {
  const container = buildOverview(discordUser, client);
  container.addActionRowComponents(buildNavButtons());
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
