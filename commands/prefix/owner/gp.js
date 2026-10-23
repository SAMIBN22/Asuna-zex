/**
 * &gp — Guild Presence command.
 *
 * Everyone:
 *   &gp               → Show bot avatar, banner, and name
 *
 * Granted users / Owners:
 *   &gp avatar <url>  → Change bot's guild-specific avatar
 *   &gp banner <url>  → Change bot's guild-specific banner
 *   &gp nick <name>   → Change bot's nickname in this guild
 *   &gp nick          → Reset nickname to default
 *
 * Owners only (no subcommand shows panel):
 *   Full control panel is in &taysse
 */

import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    Routes,
} from 'discord.js';
import fetch from 'node-fetch';
import config from '../../../config/config.js';
import GpPermission from '../../../models/gpPermission.js';
import themeManager from '../../../themes/themeManager.js';

const OWNER_IDS = (config.devIds || []).map(String);
function isOwner(id) { return OWNER_IDS.includes(String(id)); }

/** Fetch URL → base64 data-URI (node-fetch v3 compatible) */
async function toDataUri(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);

        const mime = res.headers.get('content-type')?.split(';')[0] || '';
        if (!mime.startsWith('image/')) {
            throw new Error(
                `URL did not return an image (got \`${mime || 'unknown'}\`).\n` +
                `> Some sites (like Pinterest) block direct downloads.\n` +
                `> Please upload the image to **imgur.com** or **Discord CDN** and use that URL instead.`
            );
        }

        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 9_000_000) throw new Error('Image is too large (max ~9 MB). Please use a smaller image.');

        return `data:${mime};base64,${buf.toString('base64')}`;
    } finally {
        clearTimeout(timer);
    }
}

export default {
    name:        'gp',
    aliases:     ['guilpresence', 'botpanel'],
    description: 'Show bot profile — avatar, banner & name. Owners can also edit them.',
    category:    'Owner',
    usage:       '&gp [avatar|banner|nick] [value]',

    async execute(message, args, client) {
        const userId  = message.author.id;
        const guild   = message.guild;
        const owner   = isOwner(userId);
        const theme   = await themeManager.getTheme(guild.id);
        const accent  = themeManager.getRGBColor(theme.color);
        const emojis  = theme.emojis;
        const sub     = args[0]?.toLowerCase();

        // ── Subcommand: avatar / banner ────────────────────────────────────────
        if (sub === 'avatar' || sub === 'banner') {
            const perm = `gp ${sub}`;
            if (!owner && !(await GpPermission.can(userId, guild.id, perm))) return;

            const url = args[1];
            if (!url?.startsWith('http')) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accent)
                            .addTextDisplayComponents(text => text.setContent(
                                `## ${emojis.info || ''} __Usage__\n` +
                                `> ${emojis.star || ''} **\`&gp ${sub} <image_url>\`**\n` +
                                `> ${emojis.star || ''} Use a direct image link (imgur, Discord CDN, etc.)`
                            ))
                    ],
                    allowedMentions: { parse: [] },
                });
            }

            const loading = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(text => text.setContent(
                            `## ${emojis.title || ''} __Applying ${sub}…__\n> Please wait.`
                        ))
                ],
                allowedMentions: { parse: [] },
            });

            try {
                const dataUri = await toDataUri(url);

                // Change guild-specific avatar/banner via /guilds/{id}/members/@me
                // so it only affects THIS server, not global profile.
                const updated = await client.rest.patch(
                    Routes.guildMember(guild.id, '@me'),
                    { body: { [sub]: dataUri } }
                );

                // Force-refresh guild member cache
                await guild.members.fetch({ user: client.user.id, force: true }).catch(() => {});

                const isAvatar = sub === 'avatar';
                const subLabel = isAvatar ? 'Avatar' : 'Banner';
                const newHash  = updated?.[sub] ?? null;
                // Build CDN URL from the returned hash (guild member assets path)
                const cdnBase  = isAvatar
                    ? `https://cdn.discordapp.com/guilds/${guild.id}/users/${client.user.id}/avatars`
                    : `https://cdn.discordapp.com/guilds/${guild.id}/users/${client.user.id}/banners`;
                const cdnUrl   = newHash
                    ? `${cdnBase}/${newHash}.png?size=512`
                    : url;

                await loading.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accent)
                            .addTextDisplayComponents(text => text.setContent(
                                `## ${emojis.yes || ''} __${subLabel} Updated__\n` +
                                `> ${emojis.star || ''} **Applied by:** ${message.author.toString()}\n` +
                                `> ${emojis.star || ''} Visible only in **this server** (guild-specific).`
                            ))
                            .addMediaGalleryComponents(gallery => gallery
                                .addItems(item => item.setURL(cdnUrl).setDescription(`New bot ${subLabel}`))
                            )
                    ],
                    allowedMentions: { parse: [] },
                });
            } catch (e) {
                await loading.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accent)
                            .addTextDisplayComponents(text => text.setContent(
                                `## ${emojis.info || ''} __Failed__\n> ${emojis.star || ''} \`${e.message}\``
                            ))
                    ],
                    allowedMentions: { parse: [] },
                });
            }
            return;
        }

        // ── Subcommand: nick ───────────────────────────────────────────────────
        if (sub === 'nick') {
            const perm = 'gp nick';
            if (!owner && !(await GpPermission.can(userId, guild.id, perm))) return;

            const nick    = args.slice(1).join(' ').trim() || null;
            const loading = await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(text => text.setContent(
                            `## ${emojis.title || ''} __Updating nickname…__\n> Please wait.`
                        ))
                ],
                allowedMentions: { parse: [] },
            });

            try {
                // Nickname is guild-scoped — use @me to modify own member
                await client.rest.patch(
                    Routes.guildMember(guild.id, '@me'),
                    { body: { nick: nick ?? '' } }
                );
                await loading.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accent)
                            .addSectionComponents(section => section
                                .addTextDisplayComponents(text => text.setContent(
                                    `## ${emojis.yes || ''} __Nickname ${nick ? 'Updated' : 'Reset'}__\n` +
                                    (nick
                                        ? `> ${emojis.star || ''} **New name:** ${nick}\n`
                                        : `> ${emojis.star || ''} Reset to default username\n`) +
                                    `> ${emojis.star || ''} **Done by:** ${message.author.toString()}`
                                ))
                                .setThumbnailAccessory(thumb => thumb.setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 })))
                            )
                    ],
                    allowedMentions: { parse: [] },
                });
            } catch (e) {
                await loading.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(accent)
                            .addTextDisplayComponents(text => text.setContent(
                                `## ${emojis.info || ''} __Failed__\n> ${emojis.star || ''} \`${e.message}\``
                            ))
                    ],
                    allowedMentions: { parse: [] },
                });
            }
            return;
        }

        // ── No subcommand → Bot Profile Gallery (everyone) ────────────────────
        // Force-fetch both the user and guild member to bypass stale cache.
        const botUser      = await client.users.fetch(client.user.id, { force: true });
        const guildMember  = await guild.members.fetch({ user: client.user.id, force: true }).catch(() => null);
        const avatarUrl    = botUser.displayAvatarURL({ extension: 'png', size: 4096 });
        const bannerUrl    = botUser.bannerURL?.({ extension: 'png', size: 4096 }) ?? null;
        const guildAvatar  = guildMember?.displayAvatarURL({ extension: 'png', size: 4096 }) ?? null;
        const guildBanner  = guildMember?.bannerURL?.({ extension: 'png', size: 4096 }) ?? null;
        const displayAvatar = guildAvatar || avatarUrl;
        const displayBanner = guildBanner || bannerUrl;
        const botName       = guildMember?.displayName || botUser.username;

        // Build container
        let container = new ContainerBuilder()
            .setAccentColor(accent)
            .addSectionComponents(section => section
                .addTextDisplayComponents(text => text.setContent(
                    `## ${emojis.title || ''} **${botName}**\n` +
                    `> ${emojis.star || ''} **Username:** \`${botUser.username}\`\n` +
                    `> ${emojis.star || ''} **ID:** \`${botUser.id}\`\n` +
                    `> ${emojis.star || ''} **Created:** <t:${Math.floor(botUser.createdTimestamp / 1000)}:D>`
                ))
                .setThumbnailAccessory(thumb => thumb.setURL(displayAvatar))
            )
            .addSeparatorComponents(new SeparatorBuilder());

        if (displayBanner) {
            container = container
                .addMediaGalleryComponents(gallery => gallery
                    .addItems(item => item.setURL(displayBanner).setDescription(`${botName} — Banner`))
                )
                .addSeparatorComponents(new SeparatorBuilder());
        }

        // Avatar / Banner switch buttons
        const avatarBtn = new ButtonBuilder()
            .setCustomId('gp_view_avatar')
            .setLabel('Avatar')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const bannerBtn = new ButtonBuilder()
            .setCustomId('gp_view_banner')
            .setLabel('Banner')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!displayBanner);

        container = container.addActionRowComponents(row => row.addComponents(avatarBtn, bannerBtn));

        // Owner: add management buttons row
        if (owner) {
            container = container
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(text => text.setContent(
                    `-# ${emojis.star || ''} Owner controls — use \`&gp avatar\`, \`&gp banner\`, \`&gp nick\` or \`&taysse\` to manage.`
                ));
        }

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { parse: [] },
        });

        // Toggle avatar / banner view
        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time:   120_000,
        });

        let showingAvatar = true;

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'gp_view_avatar') {
                showingAvatar = true;
            } else if (interaction.customId === 'gp_view_banner') {
                showingAvatar = false;
            }

            const currentImg = showingAvatar ? displayAvatar : (displayBanner ?? displayAvatar);
            const label      = showingAvatar ? 'Avatar' : 'Banner';

            const updated = new ContainerBuilder()
                .setAccentColor(accent)
                .addSectionComponents(section => section
                    .addTextDisplayComponents(text => text.setContent(
                        `## ${emojis.title || ''} **${botName}** — ${label}\n` +
                        `> ${emojis.star || ''} **Username:** \`${botUser.username}\`\n` +
                        `> ${emojis.star || ''} **ID:** \`${botUser.id}\``
                    ))
                    .setThumbnailAccessory(thumb => thumb.setURL(displayAvatar))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addMediaGalleryComponents(gallery => gallery
                    .addItems(item => item.setURL(currentImg).setDescription(`${botName} — ${label}`))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(row => row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('gp_view_avatar')
                        .setLabel('Avatar')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(showingAvatar),
                    new ButtonBuilder()
                        .setCustomId('gp_view_banner')
                        .setLabel('Banner')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!showingAvatar || !displayBanner),
                ));

            await interaction.update({
                flags: MessageFlags.IsComponentsV2,
                components: [updated],
                allowedMentions: { parse: [] },
            });
        });
    },
};
