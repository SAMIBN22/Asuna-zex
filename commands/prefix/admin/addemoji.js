import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    PermissionFlagsBits,
    parseEmoji
} from 'discord.js';

export default {
    name: "addemoji",
    aliases: ["steal", "createemoji", "se"],
    description: "Add an emoji to the server from a URL or another emoji",
    category: "Admin",
    usage: "+addemoji <emoji/url> [name]",

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        // Permission check (user)
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                                `> ${emojis.star || ''} **__You need the Manage Emojis permission__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        // Permission check (bot)
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                                `> ${emojis.star || ''} **__I need the Manage Emojis permission__**\n` +
                                `> ${emojis.star || ''} **__to perform this action in this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        if (!args[0]) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __How To Use__\n\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}addemoji <emoji/url> [name]\`\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}addemoji :kurumi: Cutie\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        let emojiUrls = [];
        let emojiNames = [];

        // Check for multiple emojis in one go (mentions)
        const customEmojiRegex = /<a?:(\w+):(\d+)>/g;
        let match;
        while ((match = customEmojiRegex.exec(args.join(' '))) !== null) {
            const isAnimated = match[0].startsWith('<a:');
            emojiUrls.push(`https://cdn.discordapp.com/emojis/${match[2]}.${isAnimated ? 'gif' : 'png'}`);
            emojiNames.push(match[1]);
        }

        // If no custom emojis found, check for URL or single name
        if (emojiUrls.length === 0) {
            const urlRegex = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))(\?.*)?$/i;
            if (urlRegex.test(args[0])) {
                emojiUrls.push(args[0]);
                emojiNames.push(args[1] || `emoji_${Math.floor(Math.random() * 1000)}`);
            }
        }

        if (emojiUrls.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Invalid Input__\n\n` +
                                `> ${emojis.star || ''} **__Please provide a valid emoji or image URL.__**`
                            )
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        const successEmojis = [];
        const failedEmojis = [];

        for (let i = 0; i < emojiUrls.length; i++) {
            try {
                // Validate the URL returns real image data before sending to Discord
                const res = await fetch(emojiUrls[i]);
                if (!res.ok) {
                    failedEmojis.push(`\`${emojiNames[i]}\`: Could not fetch image (HTTP ${res.status})`);
                    continue;
                }
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.startsWith('image/')) {
                    failedEmojis.push(`\`${emojiNames[i]}\`: URL did not return an image`);
                    continue;
                }
                const buffer = Buffer.from(await res.arrayBuffer());
                const added = await message.guild.emojis.create({
                    attachment: buffer,
                    name: emojiNames[i]
                });
                successEmojis.push(added.toString());
            } catch (err) {
                console.error(`[AddEmoji] Failed to add ${emojiNames[i]}:`, err);
                failedEmojis.push(`\`${emojiNames[i]}\`: ${err.message}`);
            }
        }

        const container = new ContainerBuilder()
            .setAccentColor(themeColor);

        if (successEmojis.length > 0) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ${emojis.yes || ''} __Emoji(s) Added__\n\n` +
                    `> ${emojis.star || ''} **__Successfully added:__**\n` +
                    `> ${successEmojis.join(' ')}`
                )
            );
        }

        if (failedEmojis.length > 0) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ${emojis.info || ''} __Failed to Add__\n\n` +
                    `> ${failedEmojis.map(f => `${emojis.dot || '•'} ${f}`).join('\n> ')}`
                )
            );
        }

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
    }
};
