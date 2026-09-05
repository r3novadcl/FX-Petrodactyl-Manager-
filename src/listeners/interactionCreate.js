import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';

import { getEmoji } from '../utils/emoji.js';
import { getRemainingCooldown, triggerCooldown, formatCooldown } from '../utils/cooldown.js';
import { getPanelConfig, setScanData, setScanError } from '../utils/panel.js';
import { getLinkedAccount, findDiscordUserByPanelUserId, markPasswordRegenerated } from '../utils/panelUsers.js';
import { deletePanelServer, createPanelServer, getEggDetail, getFreeAllocation, scanPanel, updatePanelUserPassword, PanelApiError } from '../utils/panelApi.js';
import { generatePassword } from '../utils/password.js';
import { generateServerName } from '../utils/randomName.js';

import { buildConfirmCard as buildDeleteConfirmCard, buildFinalConfirmCard, buildResultCard as buildDeleteResultCard } from '../commands/shared/server-delete.js';
import {
  sessions,
  buildEggPickerCard,
  buildUserPickerCard,
  buildConfirmCard as buildCreateConfirmCard,
  buildErrorCard as buildCreateErrorCard,
  buildResultCard as buildCreateResultCard,
} from '../commands/shared/create-server.js';
import { buildPanelDetailCard } from '../commands/shared/configure.js';
import { performRescan } from '../commands/shared/rescan.js';

const PANEL_ACCENT = 0xffffff;

function buildEmailCard(email, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('chat')}  Panel Email`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Email:** ${email}`));
  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

function buildRegenCard(newPassword, dmSent, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('security')}  Password Regenerated`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**New Password:** ||${newPassword}||`));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      dmSent
        ? `-# ${getEmoji('infocircle')}  Also sent to your DMs.`
        : `-# ${getEmoji('infocircle')}  Couldn't DM you — this message is the only copy.`
    )
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

function buildDmRegenCard(newPassword, panelUrl, username, avatarUrl) {
  const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${getEmoji('security')}  Password Regenerated`))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [`**Panel:** ${panelUrl}`, `**Username:** ${username}`, `**New Password:** ||${newPassword}||`].join('\n')
    )
  );
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function ephemeralError(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    try {
      // ---------- Slash commands ----------
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        if (command.cooldown) {
          const remaining = getRemainingCooldown(interaction.user.id, command.data.name);
          if (remaining > 0) {
            await interaction.reply(
              ephemeralError(`${getEmoji('error404')}  Please wait **${formatCooldown(remaining)}** before using /${command.data.name} again.`)
            );
            return;
          }
          triggerCooldown(interaction.user.id, command.data.name, command.cooldown);
        }

        await command.execute(interaction, client);
        return;
      }

      // ---------- server-delete: pick a server ----------
      if (interaction.isStringSelectMenu() && interaction.customId === 'serverdelete_select') {
        if (!interaction.inGuild() || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Only administrators can delete servers.`));
          return;
        }

        const panelConfig = getPanelConfig(interaction.guildId);
        const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });

        if (!panelConfig.scanData) {
          await interaction.update({ content: `${getEmoji('error404')}  Scan data is no longer available — run /rescan and try again.`, components: [] });
          return;
        }

        const serverId = Number(interaction.values[0]);
        const server = panelConfig.scanData.servers.find((s) => s.id === serverId);
        if (!server) {
          await interaction.update({ content: `${getEmoji('error404')}  That server is no longer in the scanned list — run /rescan.`, components: [] });
          return;
        }

        const egg = panelConfig.scanData.eggs.find((e) => e.id === server.eggId);
        await interaction.update(buildDeleteConfirmCard(server, egg?.name ?? 'Unknown', avatarUrl));
        return;
      }

      // ---------- server-delete: Next -> final confirmation ----------
      if (interaction.isButton() && interaction.customId.startsWith('serverdelete_next_')) {
        if (!interaction.inGuild() || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Only administrators can delete servers.`));
          return;
        }

        const serverId = Number(interaction.customId.replace('serverdelete_next_', ''));
        const panelConfig = getPanelConfig(interaction.guildId);
        const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });

        if (!panelConfig.scanData) {
          await interaction.update({ content: `${getEmoji('error404')}  Scan data is no longer available — run /rescan and try again.`, components: [] });
          return;
        }

        const server = panelConfig.scanData.servers.find((s) => s.id === serverId);
        if (!server) {
          await interaction.update({ content: `${getEmoji('error404')}  That server is no longer in the scanned list — run /rescan.`, components: [] });
          return;
        }

        const egg = panelConfig.scanData.eggs.find((e) => e.id === server.eggId);
        await interaction.update(buildFinalConfirmCard(server, egg?.name ?? 'Unknown', avatarUrl));
        return;
      }

      // ---------- server-delete: Cancel ----------
      if (interaction.isButton() && interaction.customId === 'serverdelete_cancel') {
        await interaction.update({ content: `${getEmoji('infocircle')}  Cancelled — no server was deleted.`, components: [] });
        return;
      }

      // ---------- server-delete: confirmed deletion ----------
      if (interaction.isButton() && interaction.customId.startsWith('serverdelete_confirm_')) {
        if (!interaction.inGuild() || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Only administrators can delete servers.`));
          return;
        }

        const serverId = Number(interaction.customId.replace('serverdelete_confirm_', ''));
        const panelConfig = getPanelConfig(interaction.guildId);
        const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });

        if (!panelConfig.panelUrl || !panelConfig.apiKey) {
          await interaction.update(buildDeleteResultCard('Panel Not Configured', 'Run /configure first.', false, avatarUrl));
          return;
        }

        const server = panelConfig.scanData?.servers.find((s) => s.id === serverId) ?? null;
        await interaction.deferUpdate();

        try {
          await deletePanelServer(panelConfig.panelUrl, panelConfig.apiKey, serverId);
          await interaction.editReply(
            buildDeleteResultCard('Server Deleted', `Server ID **${serverId}** was permanently deleted.`, true, avatarUrl, interaction.user.id)
          );

          if (server) {
            const linked = findDiscordUserByPanelUserId(interaction.guildId, server.ownerId);
            if (linked) {
              try {
                const owner = await client.users.fetch(linked.discordUserId);
                await owner.send({
                  content: [
                    `${getEmoji('error404')}  **Server Deleted**`,
                    `Your server **${server.name}** has been permanently deleted from the panel by an administrator.`,
                    'If you believe this was a mistake, please contact the server staff.',
                  ].join('\n'),
                });
              } catch {
                // owner has DMs closed or is unreachable — nothing more we can do
              }
            }
          }
        } catch (err) {
          const reason = err instanceof PanelApiError ? err.message : 'Unexpected error while deleting the server.';
          await interaction.editReply(buildDeleteResultCard('Deletion Failed', reason, false, avatarUrl));
        }
        return;
      }

      // ---------- create-server wizard ----------
      if (interaction.customId?.startsWith('createserver_')) {
        if (!interaction.inGuild() || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Only administrators can create servers.`));
          return;
        }

        const session = sessions.get(interaction.message.id);
        const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });

        if (!session) {
          await interaction.update({ content: `${getEmoji('error404')}  This wizard has expired — run /create-server again.`, components: [] });
          return;
        }
        if (interaction.user.id !== session.userId) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Only <@${session.userId}> can use this menu.`));
          return;
        }

        const panelConfig = getPanelConfig(interaction.guildId);
        if (!panelConfig.scanData) {
          sessions.delete(interaction.message.id);
          await interaction.update({ content: `${getEmoji('error404')}  Scan data is no longer available — run /rescan.`, components: [] });
          return;
        }
        const scanData = panelConfig.scanData;

        if (interaction.customId === 'createserver_node_select') {
          session.nodeId = Number(interaction.values[0]);
          await interaction.update(buildEggPickerCard(scanData, avatarUrl));
          return;
        }

        if (interaction.customId === 'createserver_egg_select') {
          session.eggId = Number(interaction.values[0]);
          await interaction.update(buildUserPickerCard(scanData, avatarUrl));
          return;
        }

        if (interaction.customId === 'createserver_user_select') {
          session.ownerId = Number(interaction.values[0]);
          const node = scanData.nodes.find((n) => n.id === session.nodeId);
          const egg = scanData.eggs.find((e) => e.id === session.eggId);
          const user = scanData.users.find((u) => u.id === session.ownerId);
          if (!node || !egg || !user) {
            sessions.delete(interaction.message.id);
            await interaction.update({ content: `${getEmoji('error404')}  Selection is no longer valid — run /create-server again.`, components: [] });
            return;
          }
          await interaction.update(buildCreateConfirmCard(session, node, egg, user, avatarUrl));
          return;
        }

        if (interaction.customId === 'createserver_cancel') {
          sessions.delete(interaction.message.id);
          await interaction.update({ content: `${getEmoji('infocircle')}  Server creation cancelled.`, components: [] });
          return;
        }

        if (interaction.customId === 'createserver_confirm') {
          const node = scanData.nodes.find((n) => n.id === session.nodeId);
          const egg = scanData.eggs.find((e) => e.id === session.eggId);
          const user = scanData.users.find((u) => u.id === session.ownerId);
          if (!node || !egg || !user) {
            sessions.delete(interaction.message.id);
            await interaction.update({ content: `${getEmoji('error404')}  Selection is no longer valid — run /create-server again.`, components: [] });
            return;
          }

          await interaction.deferUpdate();

          try {
            const allocation = await getFreeAllocation(panelConfig.panelUrl, panelConfig.apiKey, node.id);
            if (!allocation) {
              await interaction.editReply(
                buildCreateErrorCard('No Free Allocation', `Node **${node.name}** has no free IP:port allocation available. Add one on the panel and try again.`, avatarUrl)
              );
              return;
            }

            const eggDetail = await getEggDetail(panelConfig.panelUrl, panelConfig.apiKey, egg.nestId, egg.id);
            const created = await createPanelServer(panelConfig.panelUrl, panelConfig.apiKey, {
              name: generateServerName(),
              userId: user.id,
              eggId: egg.id,
              dockerImage: eggDetail.dockerImage,
              startup: eggDetail.startup,
              environment: eggDetail.environment,
              memory: session.ram,
              cpu: session.cpu,
              disk: session.disk,
              backups: session.backups,
              allocationId: allocation.id,
            });

            sessions.delete(interaction.message.id);
            await interaction.editReply(
              buildCreateResultCard('Server Created', `**${created.name}** was created on node **${node.name}** for **${user.username}**.`, true, avatarUrl)
            );
          } catch (err) {
            const reason = err instanceof PanelApiError ? err.message : 'Unexpected error while creating the server.';
            await interaction.editReply(buildCreateErrorCard('Creation Failed', reason, avatarUrl));
          }
          return;
        }
      }

      // ---------- configure: view details ----------
      if (interaction.isButton() && interaction.customId === 'panel_view_details') {
        if (!interaction.inGuild()) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  This can only be used in a server.`));
          return;
        }
        const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });
        const panelConfig = getPanelConfig(interaction.guildId);
        if (!panelConfig.panelUrl || !panelConfig.apiKey) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  No panel configured — run /configure first.`));
          return;
        }
        await interaction.reply({ ...buildPanelDetailCard(panelConfig, avatarUrl), flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        return;
      }

      // ---------- configure: rescan ----------
      if (interaction.isButton() && interaction.customId === 'panel_rescan') {
        if (!interaction.inGuild()) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  This can only be used in a server.`));
          return;
        }
        const panelConfig = getPanelConfig(interaction.guildId);
        if (!panelConfig.panelUrl || !panelConfig.apiKey) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  No panel configured — run /configure first.`));
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const avatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });
        const payload = await performRescan(interaction.guildId, avatarUrl);
        await interaction.editReply({ ...payload, flags: payload.flags | MessageFlags.Ephemeral });
        return;
      }

      // ---------- userinfo: show email ----------
      if (interaction.isButton() && interaction.customId.startsWith('userinfo_email_')) {
        const targetUserId = interaction.customId.replace('userinfo_email_', '');
        if (interaction.user.id !== targetUserId) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Only <@${targetUserId}> can view this.`));
          return;
        }
        if (!interaction.inGuild()) return;

        const account = getLinkedAccount(interaction.guildId, targetUserId);
        if (!account) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  No panel account found.`));
          return;
        }

        const avatarUrl = interaction.user.displayAvatarURL({ size: 256, extension: 'png' });
        await interaction.reply(buildEmailCard(account.email, avatarUrl));
        return;
      }

      // ---------- userinfo: regenerate password ----------
      if (interaction.isButton() && interaction.customId.startsWith('userinfo_regen_')) {
        const targetUserId = interaction.customId.replace('userinfo_regen_', '');
        if (interaction.user.id !== targetUserId) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Only <@${targetUserId}> can do this.`));
          return;
        }
        if (!interaction.inGuild()) return;

        const account = getLinkedAccount(interaction.guildId, targetUserId);
        if (!account) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  No panel account found.`));
          return;
        }

        const panelConfig = getPanelConfig(interaction.guildId);
        if (!panelConfig.panelUrl || !panelConfig.apiKey) {
          await interaction.reply(ephemeralError(`${getEmoji('error404')}  Panel not configured — ask an admin to run /configure.`));
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const avatarUrl = interaction.user.displayAvatarURL({ size: 256, extension: 'png' });
        const newPassword = generatePassword(16);

        try {
          await updatePanelUserPassword(panelConfig.panelUrl, panelConfig.apiKey, {
            userId: account.panelUserId,
            username: account.username,
            email: account.email,
            password: newPassword,
          });
        } catch (err) {
          const reason = err instanceof PanelApiError ? err.message : 'Unexpected error while regenerating the password.';
          await interaction.editReply(ephemeralError(`${getEmoji('error404')}  ${reason}`));
          return;
        }

        markPasswordRegenerated(interaction.guildId, targetUserId);

        let dmSent = false;
        try {
          await interaction.user.send(buildDmRegenCard(newPassword, panelConfig.panelUrl, account.username, avatarUrl));
          dmSent = true;
        } catch {
          dmSent = false;
        }

        await interaction.editReply(buildRegenCard(newPassword, dmSent, avatarUrl));
        return;
      }
    } catch (err) {
      console.error(err);
      const payload = ephemeralError(`${getEmoji('error404')}  Something went wrong.`);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else if (interaction.isRepliable()) {
          await interaction.reply(payload);
        }
      } catch {
        // interaction is no longer respondable — nothing more we can do
      }
    }
  },
};
