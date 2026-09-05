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

import { getEmoji } from '../utils/emoji.js';
import { PREFIX } from '../utils/config.js';
import { BRAND, BRAND_LINK, ACCENT } from '../utils/constants.js';

const MENTION_CARD_LIFETIME_MS = 30_000;

/** Shows a quick "here's what I can do" card when the bot is @mentioned (without the prefix). */
async function handleMention(message, client) {
  const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });
  const guildCount = client.guilds.cache.size;

  const container = new ContainerBuilder().setAccentColor(ACCENT);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${getEmoji('firstlinehelpmenu')}  ${BRAND}\n-# Hey ${message.author}, you called? Here's what I can do.`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${getEmoji('firstlinehelpmenu')}  **Get Started**`,
        `> Use \`/help\` or \`${PREFIX}help\` to browse all available commands.`,
        '',
        `${getEmoji('network')}  **Check Latency**`,
        `> Use \`/ping\` or \`${PREFIX}ping\` to view live WebSocket & REST latency.`,
      ].join('\n')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${getEmoji('star')}  Active in **${guildCount}** server${guildCount !== 1 ? 's' : ''}  ·  ${BRAND}`
    )
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Support Server').setURL(BRAND_LINK).setStyle(ButtonStyle.Link)
    )
  );

  const reply = await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  setTimeout(() => reply.delete().catch(() => {}), MENTION_CARD_LIFETIME_MS);
}

export default {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (message.author.bot) return;

    const isMentionOnly =
      message.mentions.users.has(client.user.id) && !message.content.trimStart().startsWith(PREFIX);

    if (isMentionOnly) {
      await handleMention(message, client).catch(() => {});
      return;
    }

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    const command = client.prefixCommands.get(commandName);
    if (!command) return;

    try {
      await command.prefixExecute(message, args, client);
    } catch (err) {
      console.error(err);
      await message.reply(`${getEmoji('error404')}  Something went wrong.`).catch(() => {});
    }
  },
};
