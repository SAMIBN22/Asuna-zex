import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'notify',
    aliases: ['dm', 'notif', 'notification'],
    description: 'Send a private alert to a user',
    usage: '&notify <@user|ID> <message>',
    category: 'General',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        const content = args.slice(1).join(' ');

        if (!targetId || !content) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&notify <@user|ID> <message>\`**`
                            )
                        )
                ]
            });
        }

        const target = await client.users.fetch(targetId).catch(() => null);
        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __User Not Found__\n> ${emojis.star || ''} Could not find user: \`${targetId}\``
                            )
                        )
                ]
            });
        }

        const dmContainer = new ContainerBuilder().setAccentColor(accentColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.title || ''} __Alert from ${message.guild.name}__\n\n` +
                            `> ${emojis.star || ''} ${content}`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                    )
            );

        const sent = await target.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] }).catch(() => null);

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            sent
                                ? `## ${emojis.yes || ''} __Alert Sent__\n> ${emojis.star || ''} Delivered to <@${targetId}> via DM.`
                                : `## ${emojis.info || ''} __Delivery Failed__\n> ${emojis.star || ''} <@${targetId}> has DMs disabled or blocked the bot.`
                        )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
