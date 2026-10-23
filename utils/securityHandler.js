import { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';
import Warn from '../models/warn.js';
import GuildConfig from '../models/guildConfig.js';
import GuildSetup from '../models/guildSetup.js';

export default {
    async punish(client, member, action, defaultReason, settings) {
        if (!member || !member.guild) return null;
        const guild = member.guild;
        const theme = await client.themeManager.getTheme(guild.id);
        const logChannelId = settings.logsChannelId || settings.warnLogsChannelId || settings.jailLogsChannelId;
        const whitelistedRoles = settings.whitelistedRoles || [];
        const whitelistedUsers = settings.whitelistedUsers || [];

        if (whitelistedUsers.includes(member.id)) return "User Whitelisted";
        if (member.roles.cache.some(role => whitelistedRoles.includes(role.id))) return "Role Whitelisted";

        const botMember = await guild.members.fetch(client.user.id);
        let reason = defaultReason;
        if (defaultReason.includes('Anti-Link')) reason = settings.antiLinkReason || defaultReason;
        if (defaultReason.includes('Anti-Bot')) reason = settings.antiBotReason || defaultReason;
        if (defaultReason.includes('Anti-Webhook')) reason = settings.antiWebhookReason || defaultReason;
        if (defaultReason.includes('Anti-Token')) reason = settings.antiTokenReason || defaultReason;
        if (defaultReason.includes('Anti-Raid')) reason = settings.antiRaidReason || defaultReason;
        if (defaultReason.includes('Anti-Ban')) reason = settings.antiBanReason || defaultReason;
        if (defaultReason.includes('Anti-Kick')) reason = settings.antiKickReason || defaultReason;
        if (defaultReason.includes('Anti-Mute')) reason = settings.antiMuteReason || defaultReason;
        if (defaultReason.includes('ChannelCreate')) reason = settings.antiChannelCreateReason || defaultReason;
        if (defaultReason.includes('ChannelDelete')) reason = settings.antiChannelDeleteReason || defaultReason;
        if (defaultReason.includes('ChannelUpdate')) reason = settings.antiChannelUpdateReason || defaultReason;
        if (defaultReason.includes('RoleCreate')) reason = settings.antiRoleCreateReason || defaultReason;
        if (defaultReason.includes('RoleDelete')) reason = settings.antiRoleDeleteReason || defaultReason;
        if (defaultReason.includes('RoleUpdate')) reason = settings.antiRoleUpdateReason || defaultReason;
        if (defaultReason.includes('RolePermsUpdate')) reason = settings.antiRolePermsUpdateReason || defaultReason;
        if (defaultReason.includes('GuildUpdate')) reason = settings.antiGuildUpdateReason || defaultReason;

        let actionTaken = "None";

        try {
            switch (action) {
                case 'warn':
                    actionTaken = await this._handleWarn(client, member, reason, settings, theme);
                    break;
                case 'jail':
                    actionTaken = await this._handleJail(client, member, reason, settings, theme);
                    break;
                case 'kick':
                    if (member.kickable) {
                        await member.kick(reason);
                        actionTaken = "Kicked";
                    }
                    break;
                case 'ban':
                    if (member.bannable) {
                        await member.ban({ reason });
                        actionTaken = "Banned";
                    }
                    break;
                case 'clearroles':
                    const rolesToRemove = member.roles.cache.filter(role =>
                        role.id !== guild.id &&
                        role.managed === false &&
                        role.position < botMember.roles.highest.position &&
                        role.id !== settings.verifiedRoleId &&
                        role.id !== settings.unverifiedRoleId &&
                        role.id !== settings.femaleRoleId
                    );
                    if (rolesToRemove.size > 0) {
                        await member.roles.remove(rolesToRemove, reason);
                        actionTaken = "Roles Cleared";
                    }
                    break;
            }

            if (logChannelId && actionTaken !== "None") {
                this._sendLog(client, guild, member, actionTaken, reason, logChannelId, theme);
            }

        } catch (error) {
            console.error(`[Punish Error]: ${error.message}`);
        }

        return actionTaken;
    },

    async _handleWarn(client, member, reason, settings, theme) {
        const warns = await Warn.countDocuments({ guildId: member.guild.id, userId: member.id });
        let type = 'first';
        if (warns === 1) type = 'second';
        if (warns >= 2) type = 'last';

        let roleId = settings.firstWarnRoleId;
        if (type === 'second') roleId = settings.secondWarnRoleId;
        if (type === 'last') roleId = settings.lastWarnRoleId;

        if (roleId) {
            const role = member.guild.roles.cache.get(roleId);
            if (role) await member.roles.add(role, reason).catch(() => { });
        }

        await Warn.create({
            guildId: member.guild.id,
            userId: member.id,
            moderatorId: client.user.id,
            reason: reason,
            type: type
        });

        try {
            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# ${theme.emojis.title || '⚠️'} __Security Warning__\n` +
                    `> **Server:** ${member.guild.name}\n` +
                    `> **Type:** ${type}\n` +
                    `> **Reason:** ${reason}`
                )));
            await member.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
        } catch (e) { }

        return `Warned (${type})`;
    },

    async _handleJail(client, member, reason, settings, theme) {
        const jailRole = member.guild.roles.cache.get(settings.jailRoleId);
        if (!jailRole) return "None";

        const savedRoles = member.roles.cache
            .filter(role => role.id !== member.guild.id && role.id !== jailRole.id)
            .map(role => role.id);

        await member.roles.set([jailRole.id], reason).catch(() => { });

        await GuildSetup.findOneAndUpdate(
            { guildId: member.guild.id, userId: member.id, type: 'jail-record' },
            {
                savedRoles,
                jailedBy: client.user.id,
                reason,
                isActive: true,
                updatedAt: new Date()
            },
            { upsert: true }
        );

        return "Jailed";
    },

    async _sendLog(client, guild, member, action, reason, channelId, theme) {
        const logChannel = guild.channels.cache.get(channelId);
        if (!logChannel) return;

        const container = new ContainerBuilder()
            .setAccentColor(theme.color)
            .addSectionComponents(new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# ${theme.emojis.title || '🛡️'} __Security Action__\n` +
                    `> **Target:** ${member} (\`${member.id}\`)\n` +
                    `> **Action:** \`${action}\`\n` +
                    `> **Reason:** ${reason}\n` +
                    `> **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                ))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true })))
            );

        await logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
    }
};
