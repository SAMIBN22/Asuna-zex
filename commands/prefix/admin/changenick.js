import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'changenick',
    aliases: ['nickall', 'massnick'],
    description: 'Change nickname of all members with a specific role.',
    usage: '&changenick <@role> <new nickname>',
    category: 'Admin',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]?.replace(/[<@&>]/g, ''));
        const nickname = args.slice(1).join(' ');

        if (!role || !nickname) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&changenick <@role> <new nickname>\`**`
                            )
                        )
                ]
            });
        }

        await message.guild.members.fetch();
        const members = role.members;
        const botHighest = message.guild.members.me.roles.highest.position;

        let success = 0, failed = 0;
        for (const [, member] of members) {
            if (member.roles.highest.position >= botHighest || member.id === message.guild.ownerId) {
                failed++;
                continue;
            }
            await member.setNickname(nickname, `Mass nickname change by ${message.author.tag}`).then(() => success++).catch(() => failed++);
        }

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Mass Nickname Change Complete__\n` +
                                    `> ${emojis.star || ''} **Role:** ${role}\n` +
                                    `> ${emojis.star || ''} **New Nickname:** ${nickname}\n` +
                                    `> ${emojis.star || ''} **Success:** \`${success}\`\n` +
                                    `> ${emojis.star || ''} **Failed:** \`${failed}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
