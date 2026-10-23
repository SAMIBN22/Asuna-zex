import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'inrole',
    aliases: ['inrole'],
    description: 'Show List of admin, bot, users, or users by ID in server',
    usage: '&inrole <admins|bots|users|@role>',
    category: 'General',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const query = args[0]?.toLowerCase();
        if (!query) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&inrole <admins|bots|users|@role>\`**`
                            )
                        )
                ]
            });
        }

        await message.guild.members.fetch();
        let members = [];
        let title = '';

        if (query === 'admins') {
            members = message.guild.members.cache.filter(m => m.permissions.has(PermissionFlagsBits.Administrator) && !m.user.bot);
            title = 'Administrators';
        } else if (query === 'bots') {
            members = message.guild.members.cache.filter(m => m.user.bot);
            title = 'Bots';
        } else if (query === 'users') {
            members = message.guild.members.cache.filter(m => !m.user.bot);
            title = 'Users';
        } else {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(query.replace(/[<@&>]/g, ''));
            if (!role) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accentColor)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.info || ''} __Role Not Found__\n> ${emojis.star || ''} Could not find role: \`${args[0]}\``
                                )
                            )
                    ]
                });
            }
            members = role.members;
            title = role.name;
        }

        const list = [...members.values()].slice(0, 30).map(m => `> ${emojis.star || ''} ${m.toString()} (\`${m.user.tag}\`)`).join('\n') || `> ${emojis.star || ''} No members found.`;
        const overflow = members.size > 30 ? `\n> *...and ${members.size - 30} more*` : '';

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.title || ''} __${title}__ (\`${members.size}\`)\n\n${list}${overflow}`
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
