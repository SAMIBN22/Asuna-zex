/**
 * &taysse — Permission Management Panel (Bot Owners Only)
 *
 * Allows the bot owner to grant or revoke specific command permissions
 * to users in any guild, with optional expiry duration.
 *
 * Usage:
 *   &taysse               → Opens the full management panel
 *   &taysse @user         → Opens panel pre-scoped to that user
 */

import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from 'discord.js';
import GpPermission from '../../../models/gpPermission.js';
import { getGrantableCatalog } from '../../../config/grantableCommands.js';
import config from '../../../config/config.js';
import themeManager from '../../../themes/themeManager.js';

const OWNER_IDS = (config.devIds || []).map(String);
function isOwner(id) { return OWNER_IDS.includes(String(id)); }

function fmtExpiry(expiresAt) {
    if (!expiresAt) return '∞ Lifetime';
    return `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>`;
}

/** Sends the full, category-grouped list of every grantable command. */
async function sendCommandsList(message, client, accent, emojis) {
    const catalog = getGrantableCatalog(client);
    if (!catalog.size) {
        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accent).addTextDisplayComponents(text =>
                    text.setContent(`## ${emojis.info || ''} No grantable commands found.`)
                ),
            ],
            allowedMentions: { parse: [] },
        });
    }

    const totalCmds = [...catalog.values()].reduce((n, list) => n + list.length, 0);
    const sections  = [...catalog.entries()].map(([category, list]) =>
        `### ${category} (${list.length})\n` +
        list.map(c => `> ${emojis.star || ''} \`${c.name}\` — ${c.description}`).join('\n')
    );

    // Split into multiple containers if the content would be too long for one message.
    const containers = [];
    let current = `## ${emojis.title || ''} **Grantable Commands** — \`${totalCmds}\` total\n\n`;
    for (const section of sections) {
        if ((current + '\n' + section).length > 3800) {
            containers.push(current);
            current = section;
        } else {
            current += (current ? '\n\n' : '') + section;
        }
    }
    if (current) containers.push(current);

    for (const text of containers) {
        await message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accent).addTextDisplayComponents(t => t.setContent(text)),
            ],
            allowedMentions: { parse: [] },
        }).catch(() => {});
    }
}

export default {
    name:        'taysse',
    aliases:     ['permissions', 'permpanel', 'grantperm'],
    description: 'Owner: Grant or revoke command permissions for users',
    category:    'Owner',
    usage:       '&taysse [@user]',

    async execute(message, args, client) {
        const userId = message.author.id;
        if (!isOwner(userId)) return; // Silent — not an owner

        const theme  = await themeManager.getTheme(message.guild.id);
        const accent = themeManager.getRGBColor(theme.color);
        // Keep this owner panel compatible with every Discord server by using
        // Unicode characters only. Custom emoji IDs may not exist in the
        // current server and Discord rejects them in component payloads.
        const emojis = {
            title: '🛡️',
            star: '•',
            info: 'ℹ️',
        };

        // ── Subcommand: &taysse commands — list every grantable command ────────
        if (args[0]?.toLowerCase() === 'commands') {
            return sendCommandsList(message, client, accent, emojis);
        }

        // ── Resolve optional user argument ─────────────────────────────────────
        const targetId  = args[0]?.replace(/[<@!>]/g, '');
        let targetUser  = null;
        if (targetId) {
            targetUser = await client.users.fetch(targetId).catch(() => null);
        }

        // ── Fetch current permission summary ───────────────────────────────────
        const allDocs = await GpPermission.find({}).lean();
        const now     = Date.now();
        const active  = allDocs.filter(d => !d.expiresAt || new Date(d.expiresAt).getTime() > now);

        const summaryLines = active.length
            ? active.slice(0, 10).map(d => {
                const cmdList = d.commands.map(c => `\`${c}\``).join(', ');
                return `> ${emojis.star || ''} <@${d.userId}> — ${cmdList} — ${fmtExpiry(d.expiresAt)}`;
            })
            : [`> ${emojis.star || ''} No active permission grants.`];

        if (active.length > 10) {
            summaryLines.push(`> ${emojis.star || ''} *...and ${active.length - 10} more*`);
        }

        // ── Build the container ────────────────────────────────────────────────
        const catalog      = getGrantableCatalog(client);
        const totalCmds    = [...catalog.values()].reduce((n, list) => n + list.length, 0);
        const categoryList = [...catalog.entries()]
            .map(([cat, list]) => `> ${emojis.star || ''} **${cat}** — ${list.length} command${list.length === 1 ? '' : 's'}`)
            .join('\n');

        const container = new ContainerBuilder()
            .setAccentColor(accent)
            .addSectionComponents(section => section
                .addTextDisplayComponents(text => text.setContent(
                    `## ${emojis.title || ''} **Permission Management Panel**\n` +
                    `> ${emojis.star || ''} **Total active grants:** \`${active.length}\`\n` +
                    (targetUser
                        ? `> ${emojis.star || ''} **Pre-selected user:** ${targetUser.toString()}`
                        : `> ${emojis.star || ''} **Mode:** Global — all guilds`)
                ))
                .setThumbnailAccessory(thumb => thumb.setURL(
                    targetUser?.displayAvatarURL({ extension: 'png', size: 256 })
                    ?? client.user.displayAvatarURL({ extension: 'png', size: 256 })
                ))
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(text => text.setContent(
                `## ${emojis.star || ''} **Grantable Commands** — \`${totalCmds}\` total across \`${catalog.size}\` categories\n${categoryList}\n` +
                `> ${emojis.star || ''} Run \`&taysse commands\` for the full command-by-command list.`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(text => text.setContent(
                `## ${emojis.star || ''} **Active Grants**\n${summaryLines.join('\n')}`
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(row => row.addComponents(
                new ButtonBuilder()
                    .setCustomId('gp_panel_grant')
                    .setLabel('Grant Permission')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('gp_panel_revoke')
                    .setLabel('Revoke Permission')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('gp_panel_list')
                    .setLabel('Full List')
                    .setStyle(ButtonStyle.Secondary),
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(text => text.setContent(
                `-# ${emojis.star || ''} Use \`&gp avatar\`, \`&gp banner\`, \`&gp nick\` to manage bot appearance.`
            ));

        await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { parse: [] },
        });
    },
};
