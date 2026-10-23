import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'checkinviteroles',
    aliases: ['checkinviterole', 'cir', 'checkinvitesroles', 'cinvitesrole', 'cinvitesroles'],
    description: 'Check all invites in the server for assigned roles',
    usage: '&checkinviteroles',
    category: 'General',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const invites = await message.guild.invites.fetch().catch(() => null);
        if (!invites || invites.size === 0) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __No Invites__\n> ${emojis.star || ''} This server has no active invites.`
                            )
                        )
                ]
            });
        }

        const lines = await Promise.all(
            [...invites.values()].slice(0, 15).map(async (inv) => {
                const inviter = inv.inviter ? await message.guild.members.fetch(inv.inviter.id).catch(() => null) : null;
                const role = inviter?.roles.highest?.id !== message.guild.id ? inviter?.roles.highest : null;
                return `> ${emojis.star || ''} **\`${inv.code}\`** — Created by ${inv.inviter ? `<@${inv.inviter.id}>` : 'Unknown'} · Role: ${role ? role.toString() : 'None'} · Uses: \`${inv.uses}\``;
            })
        );

        const overflow = invites.size > 15 ? `\n> *...and ${invites.size - 15} more invites*` : '';

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.title || ''} __Server Invites & Roles__\n\n${lines.join('\n')}${overflow}`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                            )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
