import { resolveUser } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} from 'discord.js';

import { getInviter } from '../../../lib/inviterTracker.js';

function formatJoinDate(date) {
    if (!date) return 'Unknown';
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const m = months[date.getUTCMonth()];
    const d = date.getUTCDate();
    const y = date.getUTCFullYear();
    let h = date.getUTCHours();
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${m} ${d}, ${y} at ${h}:${min} ${ampm}`;
}

export default {
    name: 'user-info',
    aliases: ['uinfo', 'u'],
    description: 'Get detailed information about a user',
    category: 'General',
    usage: '&user-info [@user]',
    noPrefix: true,

    async execute(message, args, client) {
        const user = args[0]
            ? await resolveUser(message, args[0], client)
            : message.author;
        if (!user) {
            const errContainer = new ContainerBuilder()
                .setAccentColor(0x2B2D5C)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('#  Could not find that member/user.')
                );
            return message.reply({
                components: [errContainer],
                flags: [MessageFlags.IsComponentsV2]
            }).catch(() => {});
        }
        const guild = message.guild;
        const member = await guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            const errContainer = new ContainerBuilder()
                .setAccentColor(0x2B2D5C)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('#  User Not in Server')
                );
            return message.reply({
                components: [errContainer],
                flags: [MessageFlags.IsComponentsV2]
            }).catch(() => {});
        }

        // Invites count for this member
        let invitesCount = 0;
        try {
            const me = await guild.members.fetchMe().catch(() => null);
            if (me?.permissions?.has('ManageGuild')) {
                const fetched = await guild.invites.fetch();
                invitesCount = fetched
                    .filter(inv => inv.inviter && inv.inviter.id === user.id)
                    .reduce((sum, inv) => sum + (inv.uses || 0), 0);
            }
        } catch {}

        // Inviter
        const inviterId = await getInviter(guild.id, user.id).catch(() => null);
        const invitedBy = inviterId ? `<@${inviterId}>` : 'Unknown';

        // Highest role (skip @everyone)
        const highestRole = member.roles.highest && member.roles.highest.id !== guild.id
            ? `${member.roles.highest}`
            : 'None';

        const displayName = member.displayName || user.globalName || user.username;
        const joinedAt = formatJoinDate(member.joinedAt);

        // Server owner & banner
        const owner = await guild.fetchOwner().catch(() => null);
        const ownerName = owner ? (owner.displayName || owner.user.username) : guild.name;
        const bannerURL = 'https://i.pinimg.com/webp70/736x/3f/07/4c/3f074cf3d3caae2ee69c5b4ce965cf13.webp';

        const avatarURL = user.displayAvatarURL({ size: 512, extension: 'png', forceStatic: false });

        const infoLines = [
            `-  **Name :** <@${user.id}> (${user.username})`,
            `-  **Display Name :** ${displayName}`,
            `-  **Highest Role :** ${highestRole}`,
            `-  **Invites :** ${invitesCount}`,
            `-  **Joined Server :** ${joinedAt}`,
            `-  **Invited by :** ${invitedBy}`
        ].join('\n');

        const container = new ContainerBuilder()
            .setAccentColor(0x2B2D5C)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`#  User Information`)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(avatarURL)
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(infoLines)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${ownerName}`)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(bannerURL)
                        .setDescription('Server Banner')
                )
            );

        await message.reply({
            components: [container],
            flags: [MessageFlags.IsComponentsV2]
        }).catch(() => {});
    }
};
