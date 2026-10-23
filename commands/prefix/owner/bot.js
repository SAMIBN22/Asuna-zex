import path from 'node:path';
import { existsSync } from 'node:fs';
import {
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ContainerBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from 'discord.js';
import config from '../../../config/config.js';

function isBotOwner(userId) {
    return (config.devIds || []).some((id) => String(id) === String(userId));
}

function buildInviteUrl(client) {
    return `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
}

function findExistingChannel(guild, categoryName, channelName) {
    const category = guild.channels.cache.find(
        (channel) =>
            channel.type === ChannelType.GuildCategory &&
            channel.name === categoryName,
    );

    const channel = guild.channels.cache.find(
        (candidate) =>
            candidate.type === ChannelType.GuildText &&
            candidate.name === channelName &&
            (!category || candidate.parentId === category.id),
    );

    return { category, channel };
}

function createPanel(client, firstAnimatedImageUrl, secondAnimatedImageUrl, inviteUrl) {
    const botName = client.user.username;
    const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 512 });

    const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ✦ __${botName}__\n\n` +
                        `> A professional all-in-one Discord assistant built to keep communities **organized, protected, and active**.\n\n` +
                        `> **Prefix:** \`${config.prefix}\`  •  **Status:** \`Online\``,
                    ),
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(botAvatar)
                        .setDescription(`${botName} avatar`),
                ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems((item) =>
                item.setURL(firstAnimatedImageUrl).setDescription(`${botName} animated banner`),
            ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ✦ __Built for Better Communities__\n` +
                `> ${botName} provides dependable tools for moderation, security, server management, and daily community engagement.`,
            ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems((item) =>
                item.setURL(secondAnimatedImageUrl).setDescription(`${botName} feature banner`),
            ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ✦ __Everything Your Server Needs__\n` +
                `> Explore advanced moderation, protection systems, music, levels, automation, and powerful utilities — all in one polished experience.\n\n` +
                `> Use \`${config.prefix}help\` to discover the full command list and \`${config.prefix}setup\` to configure your server.`,
            ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> **Invite ${botName}**\n` +
                        `> Add the complete bot to your own server and unlock all available tools.`,
                    ),
                )
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setLabel(`Add ${botName}`)
                        .setStyle(ButtonStyle.Link)
                        .setURL(inviteUrl),
                ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Official ${botName} information panel • Powered by ${botName}`,
            ),
        );

    return container;
}

export default {
    name: 'bot',
    aliases: ['botpanel', 'botsetup'],
    description: 'Create the official bot information category and panel',
    category: 'Owner',
    usage: '&bot',
    ownerOnly: true,

    async execute(message, args, client) {
        // Keep this command completely silent for everyone except configured bot owners.
        if (!isBotOwner(message.author.id)) return;
        if (!message.guild) return;

        const guild = message.guild;
        const panelConfig = config.botPanel || {};
        const categoryName = panelConfig.categoryName || '✦・BOT CENTER';
        const channelName = panelConfig.channelName || '✦・bot-information';

        try {
            let { category, channel } = findExistingChannel(guild, categoryName, channelName);

            if (!category) {
                category = await guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                    reason: 'Create official bot information panel',
                });
            }

            if (!channel) {
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    topic: `Official information and invite panel for ${client.user.username}.`,
                    reason: 'Create official bot information panel',
                });
            } else if (channel.parentId !== category.id) {
                await channel.setParent(category.id, {
                    lockPermissions: false,
                    reason: 'Move official bot panel into its category',
                });
            }

            const firstImagePath = path.resolve(
                process.cwd(),
                panelConfig.firstAnimatedImagePath || '',
            );
            const secondImagePath = path.resolve(
                process.cwd(),
                panelConfig.secondAnimatedImagePath || '',
            );
            const files = [];
            let firstAnimatedImageUrl = config.panelBanners?.[0] || client.user.displayAvatarURL();
            let secondAnimatedImageUrl = config.panelBanners?.[1] || firstAnimatedImageUrl;

            if (panelConfig.firstAnimatedImagePath && existsSync(firstImagePath)) {
                const fileName = 'bot-panel-animation-one.gif';
                files.push(new AttachmentBuilder(firstImagePath, { name: fileName }));
                firstAnimatedImageUrl = `attachment://${fileName}`;
            }

            if (panelConfig.secondAnimatedImagePath && existsSync(secondImagePath)) {
                const fileName = 'bot-panel-animation-two.gif';
                files.push(new AttachmentBuilder(secondImagePath, { name: fileName }));
                secondAnimatedImageUrl = `attachment://${fileName}`;
            }

            await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    createPanel(
                        client,
                        firstAnimatedImageUrl,
                        secondAnimatedImageUrl,
                        buildInviteUrl(client),
                    ),
                ],
                files,
                allowedMentions: { parse: [] },
            });

            await message.reply({
                content: `> ✅ The official bot panel is ready: ${channel}.`,
                allowedMentions: { repliedUser: false },
            });
        } catch (error) {
            console.error('[BotPanel] Failed to create the bot information panel:', error);
            await message.reply({
                content: '> ❌ I could not create the bot panel. Please check my Manage Channels and Send Messages permissions.',
                allowedMentions: { repliedUser: false },
            }).catch(() => {});
        }
    },
};