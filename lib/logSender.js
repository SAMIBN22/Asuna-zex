/**
 * logSender.js
 * Utility for sending beautiful log embeds (Components V2) to configured channels.
 */

import {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, MessageFlags,
} from 'discord.js';
import LogConfig    from '../models/logConfig.js';
import themeManager from '../themes/themeManager.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function div(small = false) {
    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(small ? SeparatorSpacingSize.Small : SeparatorSpacingSize.Large);
}

export function ts(ms)  { return `<t:${Math.floor((ms ?? Date.now()) / 1000)}:F>`; }
export function tsR(ms) { return `<t:${Math.floor((ms ?? Date.now()) / 1000)}:R>`; }
export function now()   { return ts(Date.now()); }

/** Accent colours per event category */
export const COLORS = {
    green:  [46,  204, 113],
    red:    [231,  76,  60],
    blue:   [ 52, 152, 219],
    orange: [230, 126,  34],
    yellow: [241, 196,  15],
    purple: [155,  89, 182],
    grey:   [149, 165, 166],
};

// ── Core sender ───────────────────────────────────────────────────────────────

/**
 * Send a structured log embed to the guild's configured channel.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild}  guild
 * @param {string}  logType   - key in LogConfig (e.g. 'memberJoin')
 * @param {Function} buildFn  - (accent: number[], theme: object) => ContainerBuilder
 */
export async function sendLog(client, guild, logType, buildFn) {
    try {
        const cfg = await LogConfig.findOne({ guildId: guild.id }).lean();
        if (!cfg?.[logType]) return;

        const channel = guild.channels.cache.get(cfg[logType]);
        if (!channel?.isTextBased()) return;

        const theme  = await themeManager.getTheme(guild.id);
        const accent = themeManager.getRGBColor(theme.color);

        const container = buildFn(accent, theme);

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    } catch {
        // Never crash the bot because of a log error
    }
}

// ── Shared footer builder ─────────────────────────────────────────────────────

export function footer(guild) {
    return new TextDisplayBuilder().setContent(
        `-# 📋 ${guild.name}  •  ${new Date().toUTCString()}`
    );
}
