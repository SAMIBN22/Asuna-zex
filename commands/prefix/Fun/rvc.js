/**
 * &rvc — Random Voice Channel member picker.
 * Picks a random non-bot member from the user's current voice channel.
 */
import {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
} from 'discord.js';

export default {
    name:        'rvc',
    aliases:     ['randomvc', 'pickvc', 'vcpick'],
    description: 'Randomly picks a member from your current voice channel',
    category:    'Fun',
    usage:       '&rvc',
    guildOnly:   true,

    async execute(message, args, client) {
        const theme  = await client.themeManager.getTheme(message.guild.id);
        const accent = theme.color ?? 0x9B59B6;
        const emojis = theme.emojis;

        const voiceChannel = message.member?.voice?.channel;

        // ── Not in a voice channel ─────────────────────────────────────────────
        if (!voiceChannel) {
            const container = new ContainerBuilder()
                .setAccentColor(accent)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.no || ''} __Not in a Voice Channel__\n` +
                                `> You need to be in a voice channel to use this command.\n` +
                                `> Join any voice channel and try again!`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder()
                                .setURL(message.author.displayAvatarURL({ size: 128 }))
                        )
                );
            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        // ── Gather human members ───────────────────────────────────────────────
        const humans = [...voiceChannel.members.values()].filter(m => !m.user.bot);

        if (humans.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(accent)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${emojis.no || ''} __No Members Found__\n` +
                        `> There are no human members in **${voiceChannel.name}**.\n` +
                        `> Ask someone to join and try again!`
                    )
                );
            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        // ── Pick a random member ───────────────────────────────────────────────
        const chosen = humans[Math.floor(Math.random() * humans.length)];
        const avatarUrl = chosen.user.displayAvatarURL({ size: 256, extension: 'png' });

        const container = new ContainerBuilder()
            .setAccentColor(accent)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##  __Random Pick__`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(avatarUrl)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `${emojis.star || ''} **The chosen one is:**\n` +
                    `# ${chosen.displayName}\n` +
                    `> @${chosen.user.username}\n` +
                    `>  Voice Channel: **${voiceChannel.name}**\n` +
                    `>  Picked from **${humans.length}** member${humans.length !== 1 ? 's' : ''}`
                )
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
