import {
    Events,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    SectionBuilder,
    MediaGalleryBuilder,
    AttachmentBuilder
} from 'discord.js';
import GuildConfig from '../../models/guildConfig.js';
import GuildSetup from '../../models/guildSetup.js';
import WebhookLogger from '../../functions/webhookLogger.js';
import { setInviter } from '../../lib/inviterTracker.js';
import { buildWelcomeCard } from '../../lib/welcomeCard.js';

const invitesCache = new Map();

const createJoinLogContainer = (member, inviterId, inviteLink, client, theme) => new ContainerBuilder()
    .setAccentColor(theme.color)
    .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            mediaGalleryItem => mediaGalleryItem
                .setURL(theme.images?.main || client.user.displayAvatarURL())
                .setDescription('Member Joined')
        )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Member Joined__\n` +
                `> ${theme.emojis.star} **Member:** <@${member.id}>\n` +
                `> ${theme.emojis.star} **Username:** \`${member.user.username}\`\n` +
                `> ${theme.emojis.star} **Joined at:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n` +
                `> ${theme.emojis.star} **Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                `> ${theme.emojis.star} **Invited by:** ${inviterId ? `<@${inviterId}>` : "Unknown"}\n` +
                `> ${theme.emojis.star} **Invite link:** ${inviteLink}`
            ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true })))
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            mediaGalleryItem => mediaGalleryItem
                .setURL(theme.images?.main || client.user.displayAvatarURL())
                .setDescription('Line')
        )
    );

const createAntiBotLogContainer = (member, client, theme) => new ContainerBuilder()
    .setAccentColor(theme.color)
    .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            mediaGalleryItem => mediaGalleryItem
                .setURL(theme.images?.main || client.user.displayAvatarURL())
                .setDescription('Anti-Bot Protection')
        )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Bot Kicked__\n` +
                `> ${theme.emojis.star} **Bot:** ${member} (\`${member.id}\`)\n` +
                `> ${theme.emojis.star} **Username:** \`${member.user.username}\`\n` +
                `> ${theme.emojis.star} **Reason:** Anti-Bot protection enabled\n` +
                `> ${theme.emojis.star} **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true })))
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            mediaGalleryItem => mediaGalleryItem
                .setURL(theme.images?.main || client.user.displayAvatarURL())
                .setDescription('Line')
        )
    );

const createAntiTokenLogContainer = (member, accountAge, client, theme) => new ContainerBuilder()
    .setAccentColor(theme.color)
    .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            mediaGalleryItem => mediaGalleryItem
                .setURL(theme.images?.main || client.user.displayAvatarURL())
                .setDescription('Anti-Token Protection')
        )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `# ${theme.emojis.title} __Auto-Jailed__\n` +
                `> ${theme.emojis.star} **User:** ${member} (\`${member.id}\`)\n` +
                `> ${theme.emojis.star} **Account Age:** ${Math.floor(accountAge / (24 * 60 * 60 * 1000))} days\n` +
                `> ${theme.emojis.star} **Reason:** Suspicious new account detected\n` +
                `> ${theme.emojis.star} **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true })))
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            mediaGalleryItem => mediaGalleryItem
                .setURL(theme.images?.main || client.user.displayAvatarURL())
                .setDescription('Line')
        )
    );

const joinTracker = {
    guilds: new Map(), // guildId -> { count: number, start: number }
};

const handleAntiRaid = async (member, settings, client) => {
    if (!settings.antiRaidEnabled) return false;

    const whitelistedRoles = settings.whitelistedRoles || [];
    const whitelistedUsers = settings.whitelistedUsers || [];
    
    // 1. Only Whitelist Bypass
    if (whitelistedUsers.includes(member.id)) return false;
    if (member.roles.cache.some(role => whitelistedRoles.includes(role.id))) return false;

    const guildId = member.guild.id;
    const now = Date.now();
    const windowMs = 10000; // 10 seconds
    const maxJoins = settings.antiRaidLimit || 5;

    let data = joinTracker.guilds.get(guildId);
    if (!data || (now - data.start) > windowMs) {
        data = { count: 1, start: now };
    } else {
        data.count++;
    }
    joinTracker.guilds.set(guildId, data);

    if (data.count >= maxJoins) {
        const action = settings.antiRaidAction || 'kick';
        const securityHandler = (await import('../../utils/securityHandler.js')).default;
        await securityHandler.punish(
            client, 
            member, 
            action, 
            `Anti-Raid Protection: Mass join detected (${data.count} joins in ${windowMs/1000}s)`, 
            settings
        );
        return true;
    }
    return false;
};

const handleAntiBot = async (member, settings, client) => {
    if (settings.antiBot === 1 && member.user.bot) {
        // Universal Bypass Check for Bots
        const whitelistedUsers = settings.whitelistedUsers || [];
        if (whitelistedUsers.includes(member.id)) return false;

        const action = settings.antiBotAction || 'kick';
        const securityHandler = (await import('../../utils/securityHandler.js')).default;
        await securityHandler.punish(
            client, 
            member, 
            action, 
            "Anti-Bot protection: Unauthorized bot detected", 
            settings
        );
        return true;
    }
    return false;
};

const handleAntiToken = async (member, settings, client) => {
    if (!settings.antiTokenProtection?.enabled) return false;

    const whitelistedRoles = settings.whitelistedRoles || [];
    const whitelistedUsers = settings.whitelistedUsers || [];
    
    // 1. Only Whitelist Bypass
    if (whitelistedUsers.includes(member.id)) return false;
    if (member.roles.cache.some(role => whitelistedRoles.includes(role.id))) return false;

    const accountAge = Date.now() - member.user.createdTimestamp;
    const minAge = settings.antiTokenProtection.accountAgeDays * 24 * 60 * 60 * 1000;

    if (accountAge < minAge) {
        const jailRole = member.guild.roles.cache.get(settings.jailRoleId);
        if (!jailRole) return false;

        const savedRoles = member.roles.cache
            .filter(role => role.id !== member.guild.id && role.id !== jailRole.id)
            .map(role => role.id);

        await member.roles.set([jailRole.id], 'Auto-jailed for suspicious account');

        const jailData = new GuildSetup({
            guildId: member.guild.id,
            type: 'jail-record',
            userId: member.id,
            savedRoles,
            jailedBy: client.user.id,
            reason: 'Auto-jailed for suspicious account (new account)',
            isActive: true
        });

        await jailData.save();

        if (settings.jailLogsChannelId) {
            const logChannel = member.guild.channels.cache.get(settings.jailLogsChannelId);
            if (logChannel) {
                const theme = await client.themeManager.getTheme(member.guild.id);
                const container = createAntiTokenLogContainer(member, accountAge, client, theme);
                await logChannel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        return true;
    }

    return false;
};

const handleJailedMember = async (member, settings) => {
    const jailed = await GuildSetup.findOne({ guildId: member.guild.id, userId: member.id, type: 'jail-record', isActive: true });
    if (jailed) {
        const rolesToRemove = member.roles.cache.filter(r => r.id !== member.guild.id);
        if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove);

        if (settings.jailRoleId) {
            const jailRole = member.guild.roles.cache.get(settings.jailRoleId);
            if (jailRole) await member.roles.add(jailRole);
        }
        return true;
    }
    return false;
};

const handleUnverifiedRole = async (member, verificationSettings) => {
    if (verificationSettings?.unverifiedRoleId) {
        const unverifiedRole = member.guild.roles.cache.get(verificationSettings.unverifiedRoleId);
        if (unverifiedRole && unverifiedRole.position < member.guild.members.me.roles.highest.position) {
            await member.roles.add(unverifiedRole);
        }
    }
};

const handleAutoRole = async (member, settings) => {
    if (settings.autoRole && settings.autoRoleEnabled !== false) {
        const autoRole = member.guild.roles.cache.get(settings.autoRole);
        if (autoRole && autoRole.position < member.guild.members.me.roles.highest.position) {
            await member.roles.add(autoRole).catch(() => { });
        }
    }
};

const handleAutoNickname = async (member, settings) => {
    const joinedTag = String(settings.joinedTag || '').trim();
    const hasJoinedTag = settings.joinedTagEnabled === true && joinedTag.length > 0;
    const hasNicknameFormat = settings.autonickEnabled && settings.autonickFormat;

    if (!hasJoinedTag && !hasNicknameFormat) return;

    if (!member.manageable) {
        console.warn(
            `[AutoNickname] Cannot update ${member.user.tag} in ${member.guild.name}: ` +
            'the bot role must be higher than the member role.',
        );
        return;
    }

    const displayName = member.user.displayName || member.user.username;
    let newName;

    if (hasJoinedTag) {
        // Joined Tag management keeps the member's name and places the
        // configured text before it: "Your Tag • Member Name".
        newName = `${joinedTag} ${displayName}`;
    } else if (hasNicknameFormat) {
        // Support both formats saved by the setup panels:
        //   {tag}{displayname} (tag stored separately)
        //   #TAG{displayname} (tag already saved into the format)
        newName = String(settings.autonickFormat)
            .replaceAll('{tag}', joinedTag)
            .replaceAll('{displayname}', displayName)
            .replaceAll('{username}', member.user.username);
    } else {
        // Safety fallback for a partially configured nickname record.
        newName = displayName;
    }

    newName = newName.replace(/\s+/g, ' ').trim().slice(0, 32).trim();
    if (!newName || newName === member.nickname) return;

    await member.setNickname(newName, 'Apply joined tag and nickname management');
};

export default {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        if (!member.guild) return;

        const settings = await GuildConfig.findOne({ guildId: member.guild.id });
        const verificationSettings = settings;

        if (!settings) return;

        const isBotKicked = await handleAntiBot(member, settings, client);
        if (isBotKicked) return;

        const isRaidDetected = await handleAntiRaid(member, settings, client);
        if (isRaidDetected) return;

        const isJailed = await handleJailedMember(member, settings);
        if (isJailed) return;

        const isAntiToken = await handleAntiToken(member, settings, client);
        if (isAntiToken) return;

        // Suspension Check
        if (settings.suspendedUsers?.includes(member.id)) {
            await handleUnverifiedRole(member, verificationSettings);
            if (settings.joinLogChannel) {
                await this.handleJoinLogging(member, client, settings);
            }
            if (settings.welcomeChannelId) {
                await this.sendWelcomeCard(member, client, settings);
            }
            return;
        }

        await handleUnverifiedRole(member, verificationSettings);
        await handleAutoRole(member, settings);
        await handleAutoNickname(member, settings);

        if (settings.joinLogChannel) {
            await this.handleJoinLogging(member, client, settings);
        }

        if (settings.welcomeChannelId) {
            await this.sendWelcomeCard(member, client, settings);
        }
    },

    async sendWelcomeCard(member, client, settings) {
        try {
            const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
            if (!channel) return;

            const theme = await client.themeManager.getTheme(member.guild.id);
            const accentColor = '#' + (Number(theme.color) || 0xA78BFA).toString(16).padStart(6, '0');

            const buffer = await buildWelcomeCard({
                avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
                username: member.user.displayName || member.user.username,
                serverName: member.guild.name,
                memberCount: member.guild.memberCount,
                backgroundURL: settings.welcomeCardBackground || null,
                accentColor
            });

            const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

            const title = settings.welcomeMsg?.title
                ?.replace('{user}', member.user.username)
                ?.replace('{server}', member.guild.name);
            const body = settings.welcomeMsg?.body
                ?.replace('{user}', `<@${member.id}>`)
                ?.replace('{server}', member.guild.name);

            const container = new ContainerBuilder()
                .setAccentColor(theme.color)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${title ? `## ${title}` : `## ${theme.emojis?.title || '👋'} Welcome, ${member.user.username}!`}\n` +
                        `${body || `> ${theme.emojis?.star || '<a:15278182396090124351:1528064846267158558>'} <@${member.id}> just joined **${member.guild.name}** — we're glad to have you!`}`
                    )
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        mediaGalleryItem => mediaGalleryItem
                            .setURL('attachment://welcome.png')
                            .setDescription('Welcome Card')
                    )
                );

            await channel.send({
                content: `<@${member.id}>`,
                files: [attachment],
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: [member.id] }
            });
        } catch (err) {
            console.error('[Welcome] Failed to send welcome card:', err.message);
        }
    },

    async handleJoinLogging(member, client, settings) {
        const logChannel = member.guild.channels.cache.get(settings.joinLogChannel);
        if (!logChannel) return;

        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invitesCache.get(member.guild.id) || new Map();

        const usedInvite = newInvites.find(i => i.uses > (oldInvites.get(i.code) || 0));
        const inviterId = usedInvite?.inviter?.id || null;
        const inviteLink = usedInvite ? `https://discord.gg/${usedInvite.code}` : "Unknown";

        invitesCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));

        if (inviterId) {
            await setInviter(member.guild.id, member.id, inviterId);
        }

        const theme = await client.themeManager.getTheme(member.guild.id);
        const container = createJoinLogContainer(member, inviterId, inviteLink, client, theme);

        await logChannel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
