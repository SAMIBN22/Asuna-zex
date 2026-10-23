import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageFlags,
} from 'discord.js';
import themeManager from '../../../themes/themeManager.js';

export default {
    name: "ping",
    description: "Show bot performance and connection status",
    category: "General",
    usage: "ping",
    aliases: ["latency", "status"],

    async execute(message, args, client) {
        const { guild } = message;
        const theme = await client.themeManager.getTheme(guild.id);
        const generalEmojis = theme.emojis;
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const botName = client.user.username;

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder()
                    .setAccentColor(accentColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${generalEmojis?.title || ''} **__${botName} is analyzing connection...__**`
                        )
                    ),
            ],
            allowedMentions: { parse: [] },
        });

        const latency = Math.max(sent.createdTimestamp - message.createdTimestamp, 1);
        const apiLatency = Math.round(client.ws.ping);
        const uptime = formatUptime(client.uptime);
        const helpImage = "https://media.discordapp.net/attachments/1482847336316145787/1482848551641026601/telechargement_1.jfif?ex=69b871d4&is=69b72054&hm=21eb2d93891ed8e3197039ffc0830f5fdf0c840d0ac3bfa44360818192e72c5b&=&format=webp";
        const thumbnailImage = client.user.displayAvatarURL({ extension: 'png', size: 512 });

        const themeImage = new MediaGalleryBuilder().addItems([
            {
                media: { url: helpImage },
                title: `${generalEmojis?.title || ''} ${botName} Performance`,
                subtitle: `Advanced Discord Utility Bot`,
            },
        ]);

        const container = buildPingContainer(client, latency, apiLatency, uptime, themeImage, thumbnailImage, theme);

        await sent.edit({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { parse: [] },
        });

        const collector = sent.createMessageComponentCollector({
            time: 300000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction) => {
            if (interaction.isButton() && interaction.customId === "ping_refresh") {
                const refreshStart = Date.now();
                const newApiLatency = Math.round(client.ws.ping);
                const newUptime = formatUptime(client.uptime);

                const processingTime = Date.now() - refreshStart;
                const newLatency = Math.max(processingTime, 1);

                const refreshContainer = buildPingContainer(client, newLatency, newApiLatency, newUptime, themeImage, thumbnailImage, theme);

                await interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [refreshContainer],
                    allowedMentions: { parse: [] },
                });
            }
        });
    },
};

function buildPingContainer(client, latency, apiLatency, uptime, themeImage, thumbnailImage, theme) {
    const generalEmojis = theme.emojis;
    const accentColor = themeManager.getRGBColor(theme.color);
    const botName = client.user.username;

    return new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# __${generalEmojis?.title || ''} ${botName} Performance__`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(themeImage)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${generalEmojis?.title || ''} **__Performance Metrics__**\n` +
                        `> ${generalEmojis?.star || ''} **__Response Speed:__** \`${latency}ms\`\n` +
                        `> ${generalEmojis?.star || ''} **__Discord API:__** \`${apiLatency}ms\`\n` +
                        `> ${generalEmojis?.star || ''} **__Uptime:__** \`${uptime}\``
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(thumbnailImage)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${generalEmojis?.title || ''} **__${botName} Status__**\n` +
                `\`\`\`ansi\n${getStatusInfo(latency, apiLatency, uptime, theme)}\n\`\`\``
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> ${generalEmojis?.title || ''} *__${botName} is ready to serve__*`
                    )
                )
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setLabel("Refresh")
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("ping_refresh")
                )
        );
}

function getThemeAnsiCode(theme) {
    const themeColors = {
        cyan: '34',
        red: '31',
        green: '32',
        gold: '33',
        yellow: '33',
        purple: '45',
        pink: '35',
        grey: '37',
        black: '30',
        white: '37'
    };
    try {
        const themes = themeManager.themes || {};
        const themeName = Object.keys(themes).find(name =>
            themes[name].color === theme.color
        );

        return themeColors[themeName] || '36';
    } catch (error) {
        return '36';
    }
}

function getStatusInfo(latency, apiLatency, uptime, theme) {
    const themeAnsiCode = getThemeAnsiCode(theme);

    return [
        `\u001b[${themeAnsiCode}m// Discord API Status\u001b[0m`,
        `\u001b[${themeAnsiCode}mStatus     = "${apiLatency < 200 ? 'Optimal' : apiLatency < 400 ? 'Stable' : 'Slow'}";\u001b[0m`,
        `\u001b[${themeAnsiCode}mLatency    = ${apiLatency}ms;\u001b[0m`,
        '',
        `\u001b[${themeAnsiCode}m// Bot Performance\u001b[0m`,
        `\u001b[${themeAnsiCode}mStatus     = "${latency < 100 ? 'Peak Performance' : latency < 200 ? 'Good Response' : 'Needs Attention'}";\u001b[0m`,
        `\u001b[${themeAnsiCode}mLatency    = ${latency}ms;\u001b[0m`,
        `\u001b[${themeAnsiCode}mUptime     = "${uptime}";\u001b[0m`
    ].join('\n');
}

function formatUptime(uptime) {
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}
