import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import emojis from '../../emojis.js';

export default {
    name: 'emoji',
    aliases: ['emote', 'emojimanage'],
    description: 'Manage server emojis — add, remove, or list',
    category: 'BotManage',
    usage: '&emoji add <name> <emoji|URL|attachment> | &emoji remove <emoji|name> | &emoji list',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const sub = args[0]?.toLowerCase();

        if (!sub || !['add', 'remove', 'list'].includes(sub)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Emoji Manager — Usage__\n` +
                        `> ${emojis.star || ''} **\`&emoji add <name> <emoji|URL|attachment>\`**\n` +
                        `> ${emojis.star || ''} **\`&emoji remove <emoji|name>\`**\n` +
                        `> ${emojis.star || ''} **\`&emoji list\`**`
                    ))]
            });
        }

        // LIST
        if (sub === 'list') {
            const guildEmojis = message.guild.emojis.cache;
            if (!guildEmojis.size) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __No Emojis__\n> ${emojis.star || ''} This server has no custom emojis.`
                        ))]
                });
            }
            const static_ = guildEmojis.filter(e => !e.animated);
            const animated = guildEmojis.filter(e => e.animated);
            const staticList = static_.map(e => `${e.toString()} \`${e.name}\``).slice(0, 20).join('  ') || 'None';
            const animatedList = animated.map(e => `${e.toString()} \`${e.name}\``).slice(0, 20).join('  ') || 'None';
            const overflow = guildEmojis.size > 40 ? `\n> *...and ${guildEmojis.size - 40} more*` : '';

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Server Emojis__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} __Static (${static_.size})__\n> ${staticList}\n\n` +
                            `## ${emojis.star || ''} __Animated (${animated.size})__\n> ${animatedList}${overflow}`
                        ))
                ],
                allowedMentions: { parse: [] }
            });
        }

        // ADD / REMOVE — require Manage Emojis
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Permission Denied__\n> ${emojis.star || ''} You need **Manage Expressions** permission.`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                    )],
                allowedMentions: { parse: [] }
            });
        }

        // ADD
        if (sub === 'add') {
            const name = args[1];
            if (!name) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&emoji add <name> <emoji|URL|attachment>\`**`
                        ))]
                });
            }

            let attachment = message.attachments.first()?.url || args[2];

            // If arg[2] is a custom emoji string like <:name:id>
            if (!attachment) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Missing Source__\n> ${emojis.star || ''} Provide a **URL**, **emoji**, or **attachment** to add.\n> ${emojis.star || ''} **Example:** \`&emoji add myemoji https://example.com/image.png\``
                        ))]
                });
            }

            // Handle custom emoji format <:name:id> or <a:name:id>
            const emojiMatch = attachment.match(/<a?:\w+:(\d+)>/);
            if (emojiMatch) {
                const animated = attachment.startsWith('<a:');
                attachment = `https://cdn.discordapp.com/emojis/${emojiMatch[1]}.${animated ? 'gif' : 'png'}`;
            }

            try {
                const created = await message.guild.emojis.create({ attachment, name });
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accentColor)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Emoji Added__`))
                            .addSeparatorComponents(new SeparatorBuilder())
                            .addSectionComponents(new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${created.toString()} \`${created.name}\`\n` +
                                    `> ${emojis.star || ''} **ID:** \`${created.id}\`\n` +
                                    `> ${emojis.star || ''} **Animated:** ${created.animated ? 'Yes' : 'No'}\n` +
                                    `> ${emojis.star || ''} **Added by:** ${message.author.toString()}`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(created.imageURL({ size: 128 })))
                            )
                    ],
                    allowedMentions: { parse: [] }
                });
            } catch (err) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Failed to Add__\n> ${emojis.star || ''} ${err.message}`
                        ))]
                });
            }
        }

        // REMOVE
        if (sub === 'remove') {
            const emojiInput = args[1];
            if (!emojiInput) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&emoji remove <emoji|name|ID>\`**`
                        ))]
                });
            }

            const idMatch = emojiInput.match(/\d{15,}/);
            const emojiId = idMatch?.[0];
            const targetEmoji = emojiId
                ? message.guild.emojis.cache.get(emojiId)
                : message.guild.emojis.cache.find(e => e.name.toLowerCase() === emojiInput.toLowerCase());

            if (!targetEmoji) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Emoji Not Found__\n> ${emojis.star || ''} Could not find emoji: \`${emojiInput}\``
                        ))]
                });
            }

            try {
                const emojiName = targetEmoji.name;
                await targetEmoji.delete();
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.title || ''} __Emoji Removed__\n` +
                            `> ${emojis.star || ''} **Name:** \`${emojiName}\`\n` +
                            `> ${emojis.star || ''} **Removed by:** ${message.author.toString()}`
                        ))]
                });
            } catch (err) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Failed to Remove__\n> ${emojis.star || ''} ${err.message}`
                        ))]
                });
            }
        }
    }
};
