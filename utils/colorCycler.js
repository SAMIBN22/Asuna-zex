/**
 * colorCycler.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Cycles a Discord ComponentsV2 container's accent colour through 10 vibrant
 * RGB colours, changing every 5 seconds, by periodically editing the message.
 *
 * Usage:
 *   import { startColorCycle, CYCLE_COLORS } from '../utils/colorCycler.js';
 *
 *   // Use CYCLE_COLORS[0] as the first accent colour when you build the panel.
 *   const sent = await message.reply({ ..., components: [buildPanel(CYCLE_COLORS[0])] });
 *
 *   // Start cycling — returns a stopper function.
 *   const stopCycle = startColorCycle(sent, async (color) => [buildPanel(color)]);
 *
 *   // Call stopCycle() when you want to stop (e.g. collector end, timeout, etc.)
 */

import { MessageFlags } from 'discord.js';

// ── 10 vivid accent colours ────────────────────────────────────────────────────
export const CYCLE_COLORS = [
    [255,  71,  87],   // 🔴 Crimson
    [249, 115,  22],   // 🟠 Blaze Orange
    [245, 158,  11],   // 🟡 Amber
    [132, 204,  22],   // 🟢 Lime
    [ 16, 185, 129],   // 🟢 Emerald
    [  6, 182, 212],   // 🔵 Cyan
    [ 59, 130, 246],   // 🔵 Royal Blue
    [ 99, 102, 241],   // 🟣 Indigo
    [168,  85, 247],   // 🟣 Violet
    [236,  72, 153],   // 🩷 Hot Pink
];

const INTERVAL_MS = 2_000; // 2 seconds between each colour change

/**
 * Start cycling accent colours on an already-sent message.
 *
 * @param {import('discord.js').Message} sentMessage
 *   The message whose components will be edited on each tick.
 *
 * @param {(color: [number,number,number]) => Promise<any[]> | any[]} buildFn
 *   Called every tick with the next [r, g, b] colour.
 *   Must return the full `components` array for the new message edit.
 *
 * @param {number|null} maxDurationMs
 *   Optional auto-stop after this many ms (default null = run until stopped).
 *   Useful for non-interactive panels that have no collector to clean up.
 *
 * @returns {() => void} stopCycle — call this to cancel the cycle.
 */
export function startColorCycle(sentMessage, buildFn, maxDurationMs = null) {
    let index = 0;

    const interval = setInterval(async () => {
        index = (index + 1) % CYCLE_COLORS.length;
        try {
            const components = await buildFn(CYCLE_COLORS[index]);
            await sentMessage.edit({
                flags:      MessageFlags.IsComponentsV2,
                components,
            });
        } catch {
            // Message deleted, rate-limited, or bot lost permissions — bail silently.
            clearInterval(interval);
            if (autoStopTimer) clearTimeout(autoStopTimer);
        }
    }, INTERVAL_MS);

    // Optional auto-stop timer
    let autoStopTimer = null;
    if (maxDurationMs) {
        autoStopTimer = setTimeout(() => clearInterval(interval), maxDurationMs);
    }

    return () => {
        clearInterval(interval);
        if (autoStopTimer) clearTimeout(autoStopTimer);
    };
}

// ── HSL → RGB helper ───────────────────────────────────────────────────────────
function hslToRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Generate N evenly-spaced colours from the full HSL hue wheel.
 * Count can be any number ≥ 1.
 * @param {number} count
 * @returns {[number,number,number][]}
 */
export function getColorPalette(count) {
    const palette = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 360 / count) % 360;
        palette.push(hslToRgb(hue / 360, 0.85, 0.55));
    }
    return palette;
}
