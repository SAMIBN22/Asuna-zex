import { resolveMember } from '../../../lib/resolveUser.js';
import {
    TextDisplayBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    SectionBuilder,
    MessageFlags
} from 'discord.js';

const BADGE_EMOJIS = {
    Staff: '',
    Partner: '',
    Hypesquad: '',
    BugHunterLevel1: '',
    PremiumEarlySupporter: '',
    BugHunterLevel2: '',
    VerifiedBot: '',
    VerifiedDeveloper: '‍',
    CertifiedModerator: '',
    ActiveDeveloper: '',
    Nitro: '',
    Boost: '',
    Quest: '',
    EarlySupporter: '',
    OriginalBotDev: '',
    Orbs: ''
};

const STATUS_MAP = {
    online: { emoji: '', text: 'Online' },
    idle: { emoji: '', text: 'Idle' },
    dnd: { emoji: '', text: 'DND' },
    offline: { emoji: '', text: 'Offline' }
};

const getAllBadges = (user) => {
    const flags = user.publicFlags?.toArray() || [];
    const badges = flags.filter(flag => BADGE_EMOJIS[flag]).map(flag => BADGE_EMOJIS[flag]);

    if (user.avatar?.startsWith("a_") || user.banner) badges.push(BADGE_EMOJIS.Nitro);
    if (flags.includes("PremiumEarlySupporter")) badges.push(BADGE_EMOJIS.Boost);
    if (flags.some(f => f.includes("HypeSquadOnlineHouse"))) badges.push(BADGE_EMOJIS.Hypesquad);
    if (flags.includes("Quarantined")) badges.push(BADGE_EMOJIS.Quest);
    if (flags.includes("Orbs")) badges.push(BADGE_EMOJIS.Orbs);

    return badges.length ? badges.join(" ") : "No badges";
};


const formatUserInfo = (user, targetUser, theme) => {
    const star = theme.emojis.star || '';
    const status = targetUser.presence?.status || 'offline';
    const statusObj = STATUS_MAP[status] || STATUS_MAP.offline;
    const accountAge = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const serverAge = Math.floor((Date.now() - targetUser.joinedTimestamp) / (1000 * 60 * 60 * 24));
    const rolesArr = targetUser.roles.cache.filter(r => r.id !== targetUser.guild.id).sort((a, b) => b.position - a.position).map(r => r.toString());
    const accentColor = user.accentColor ? `#${user.accentColor.toString(16).padStart(6, '0')}` : 'None';
    const boostSince = targetUser.premiumSince ? `<t:${Math.floor(targetUser.premiumSince.getTime() / 1000)}:R>` : null;

    return {
        basic: `> ${star} **__Username:__ \`${user.username}\`**\n` +
            `> ${star} **__Display Name:__ ${targetUser.displayName === user.username ? '`None`' : `\`${targetUser.displayName}\``}**\n` +
            `> ${star} **__Mention:__ <@${user.id}>**\n` +
            `> ${star} **__User ID:__ \`${user.id}\`**\n` +
            `> ${star} **__Status:__ ${statusObj.emoji} \`${statusObj.text}\`**\n` +
            `> ${star} **__Joined Discord:__ <t:${Math.floor(user.createdTimestamp / 1000)}:R>**\n` +
            `> ${star} **__Account Age:__ \`${accountAge} days\`**`,

        server: `> ${star} **__Role Count:__ \`${rolesArr.length}\`**\n` +
            `> ${star} **__Highest Role:__ ${targetUser.roles.highest?.toString() || 'None'}**\n` +
            `> ${star} **__Joined Server:__ <t:${Math.floor(targetUser.joinedTimestamp / 1000)}:R>**\n` +
            `> ${star} **__Server Age:__ \`${serverAge} days\`**\n` +
            `> ${star} **__Boosting Status:__ ${targetUser.premiumSince ? '**Yes**' : '**No**'}${boostSince ? ` (since ${boostSince})` : ''}**\n` +
            `> ${star} **__Accent Color:__ \`${accentColor}\`**\n` +
            `> ${star} **__Roles:__ ${rolesArr.slice(0, 10).join(' ') || '`None`'}${rolesArr.length > 10 ? '...' : ''}**`,

        extras: `> ${star} **__Badges:__ ${getAllBadges(user)}**\n` +
            `> ${star} **__Global Banner:__ ${user.bannerURL({ extension: 'png', size: 4096 }) ? `[Available](${user.bannerURL({ extension: 'png', size: 4096 })})` : '`None`'}**\n` +
            `> ${star} **__Server Banner:__ ${targetUser.bannerURL({ extension: 'png', size: 4096 }) ? `[Available](${targetUser.bannerURL({ extension: 'png', size: 4096 })})` : '`None`'}**`
    };
};

export default {
    name: 'userinfo',
    aliases: ['user', 'whois', 'info', 'profile'],
    description: 'Get detailed information about a user',
    category: 'General',
    usage: '+userinfo [user]',
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        const targetUser = (args[0] ? await resolveMember(message, args[0]) : null) || message.member;
        const user = await client.users.fetch(targetUser.id, { force: true });
        const userInfo = formatUserInfo(user, targetUser, theme);

        const globalAvatar = user.displayAvatarURL({ extension: 'png', size: 4096 });
        const serverAvatar = targetUser.displayAvatarURL({ extension: 'png', size: 4096 });
        const hasServerAvatar = serverAvatar !== globalAvatar;

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        mediaGalleryItem => mediaGalleryItem
                            .setURL(hasServerAvatar ? serverAvatar : globalAvatar),
                        mediaGalleryItem => mediaGalleryItem
                            .setURL(globalAvatar)
                            .setSpoiler(true)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `# ${emojis.title || ''} __Basic Information__\n\n` +
                        `${userInfo.basic}`
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `# ${emojis.title || ''} __Server Information__\n\n` +
                        `${userInfo.server}`
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `# ${emojis.title || ''} __Extras & Details__\n\n` +
                        `${userInfo.extras}`
                    )
            );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { repliedUser: false }
        });
    }
};