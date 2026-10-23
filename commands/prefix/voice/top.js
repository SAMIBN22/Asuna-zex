import {
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import path from 'path';
import Profile from '../../../models/profile.js';
import { getLiveSessionMs, getUnflushedMs } from '../../../lib/voiceTracker.js';

// ── Fonts ─────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD = path.join(__dirname, '../../../assets/fonts/Roboto-Bold.ttf');
const FONT_REG  = path.join(__dirname, '../../../assets/fonts/Roboto.ttf');
const SYS_BOLD  = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const SYS_REG   = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
try { GlobalFonts.registerFromPath(FONT_BOLD, 'TopBold'); } catch { try { GlobalFonts.registerFromPath(SYS_BOLD, 'TopBold'); } catch {} }
try { GlobalFonts.registerFromPath(FONT_REG,  'TopReg');  } catch { try { GlobalFonts.registerFromPath(SYS_REG,  'TopReg');  } catch {} }

// ── Constants ─────────────────────────────────────────────────────────────────
const BG_PATH      = path.join(__dirname, '../../../assets/images/top_bg.jpg');
const ROWS_PER_PAGE = 8;
const ROW_H         = 66;
const HEADER_H      = 150;
const FOOTER_H      = 46;
const W             = 920;
const COOLDOWN_MS   = 5_000;
const cooldowns     = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
// Exact, second-precision formatter used everywhere real/exact time is shown.
function fmtExact(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    if (totalSeconds === 0) return '0s';
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

// Compact formatter for the leaderboard rows (no seconds, keeps rows tidy)
function fmtVoice(totalSeconds) {
    const totalMin = Math.floor((totalSeconds || 0) / 60);
    if (!totalMin) return '<1m';
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const d = Math.floor(h / 24);
    const hRem = h % 24;
    if (d > 0) return `${d}d ${hRem}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function fmtLiveMs(ms) {
    if (ms == null) return null;
    return fmtExact(Math.floor(ms / 1000));
}

// Total exact seconds a profile has spent in voice, including whatever time
// hasn't been flushed to the DB yet for an ongoing session (real, live value).
function exactSeconds(profile, guildId) {
    const base = profile.voiceSeconds || (profile.voiceMinutes || 0) * 60;
    const unflushed = Math.floor(getUnflushedMs(profile.userId, guildId) / 1000);
    return base + unflushed;
}

function stripSMP(str) {
    return [...(str || '')].filter(ch => ch.codePointAt(0) <= 0xFFFF).join('').trim();
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
        }
        h /= 6;
    }
    return [h * 360, s, l];
}

/**
 * Analyzes the background image to derive:
 *  - a base text color (white or dark) with best contrast
 *  - an accent color pulled from the image's dominant vivid hue
 */
function extractPalette(image) {
    const sampleSize = 48;
    const c = createCanvas(sampleSize, sampleSize);
    const ctx = c.getContext('2d');
    ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

    let totalLum = 0;
    let count = 0;
    let bestSat = -1;
    let accentH = 210, accentS = 0.6, accentL = 0.55;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLum += lum;
        count++;

        const [h, s, l] = rgbToHsl(r, g, b);
        if (s > bestSat && l > 0.15 && l < 0.9) {
            bestSat = s;
            accentH = h;
            accentS = Math.max(s, 0.55);
            accentL = Math.min(Math.max(l, 0.45), 0.62);
        }
    }

    const avgLum = totalLum / count;
    const isDark = avgLum < 140;

    return {
        isDark,
        textColor: isDark ? '#FFFFFF' : '#12141C',
        subColor: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(18,20,28,0.72)',
        shadowColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.85)',
        scrim: isDark ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.38)',
        accent: `hsl(${Math.round(accentH)}, ${Math.round(accentS * 100)}%, ${Math.round(accentL * 100)}%)`,
        accentSoft: `hsla(${Math.round(accentH)}, ${Math.round(accentS * 100)}%, ${Math.round(accentL * 100)}%, 0.35)`,
    };
}

function drawAvatarCircle(ctx, img, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else {
        ctx.fillStyle = 'rgba(120,120,130,0.6)';
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
}

function medalColor(rank) {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#D6D9DE';
    if (rank === 3) return '#CD7F32';
    return null;
}

async function buildTopCard({ guild, entries, page, totalPages, totalTracked, bgImage, palette }) {
    const H = HEADER_H + ROWS_PER_PAGE * ROW_H + FOOTER_H;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background image, cover-fit
    const scale = Math.max(W / bgImage.width, H / bgImage.height);
    const bw = bgImage.width * scale;
    const bh = bgImage.height * scale;
    ctx.drawImage(bgImage, (W - bw) / 2, (H - bh) / 2, bw, bh);

    // Readability scrim
    ctx.fillStyle = palette.scrim;
    ctx.fillRect(0, 0, W, H);
    const topFade = ctx.createLinearGradient(0, 0, 0, HEADER_H);
    topFade.addColorStop(0, palette.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.5)');
    topFade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, W, HEADER_H);

    // ── Header ──────────────────────────────────────────────────────────────
    ctx.shadowColor = palette.shadowColor;
    ctx.shadowBlur = 12;
    ctx.font = 'bold 40px TopBold, sans-serif';
    ctx.fillStyle = palette.textColor;
    ctx.fillText('VOICE LEADERBOARD', 36, 62);

    ctx.font = '18px TopReg, sans-serif';
    ctx.fillStyle = palette.subColor;
    ctx.fillText(stripSMP(guild.name), 36, 90);
    ctx.shadowBlur = 0;

    // Accent underline
    const lineGrad = ctx.createLinearGradient(36, 0, W - 36, 0);
    lineGrad.addColorStop(0, palette.accent);
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(36, 108);
    ctx.lineTo(W - 36, 108);
    ctx.stroke();

    ctx.shadowColor = palette.shadowColor;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 13px TopBold, sans-serif';
    ctx.fillStyle = palette.subColor;
    ctx.fillText(`${totalTracked} MEMBERS TRACKED  ·  PAGE ${page + 1}/${totalPages}`, 36, 132);
    ctx.shadowBlur = 0;

    // ── Rows ────────────────────────────────────────────────────────────────
    let rowY = HEADER_H;
    for (let i = 0; i < ROWS_PER_PAGE; i++) {
        const entry = entries[i];
        const y = rowY + i * ROW_H;

        if (!entry) continue;

        // Row background
        ctx.fillStyle = i % 2 === 0
            ? (palette.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
            : (palette.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)');
        ctx.fillRect(24, y + 6, W - 48, ROW_H - 12);

        const centerY = y + ROW_H / 2;
        const medal = medalColor(entry.rank);

        // Rank badge
        ctx.beginPath();
        ctx.arc(64, centerY, 20, 0, Math.PI * 2);
        ctx.fillStyle = medal || palette.accentSoft;
        ctx.fill();
        ctx.font = 'bold 16px TopBold, sans-serif';
        ctx.fillStyle = medal ? '#1A1A1A' : palette.textColor;
        const rankStr = `#${entry.rank}`;
        const rw = ctx.measureText(rankStr).width;
        ctx.fillText(rankStr, 64 - rw / 2, centerY + 5);

        // Avatar
        drawAvatarCircle(ctx, entry.avatar, 118, centerY, 22);
        ctx.strokeStyle = medal || palette.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(118, centerY, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Name
        ctx.shadowColor = palette.shadowColor;
        ctx.shadowBlur = 6;
        ctx.font = 'bold 19px TopBold, sans-serif';
        ctx.fillStyle = palette.textColor;
        let name = stripSMP(entry.name);
        if (name.length > 24) name = name.slice(0, 23) + '…';
        ctx.fillText(name, 154, centerY - 3);

        // Live indicator
        if (entry.liveMs != null) {
            ctx.font = '12px TopReg, sans-serif';
            ctx.fillStyle = '#57F287';
            ctx.fillText(`● In voice · ${fmtLiveMs(entry.liveMs)}`, 154, centerY + 16);
        } else {
            ctx.font = '12px TopReg, sans-serif';
            ctx.fillStyle = palette.subColor;
            ctx.fillText('Offline from voice', 154, centerY + 16);
        }
        ctx.shadowBlur = 0;

        // Voice time (right aligned)
        ctx.shadowColor = palette.shadowColor;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 22px TopBold, sans-serif';
        ctx.fillStyle = palette.textColor;
        const timeStr = fmtVoice(entry.voiceSeconds);
        const tw = ctx.measureText(timeStr).width;
        ctx.fillText(timeStr, W - 44 - tw, centerY + 7);
        ctx.shadowBlur = 0;
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    ctx.font = '12px TopReg, sans-serif';
    ctx.fillStyle = palette.subColor;
    ctx.fillText('Voice time is tracked automatically while you talk in voice channels', 36, H - 18);

    return canvas.toBuffer('image/png');
}

async function fetchEntries(guild, profiles) {
    return Promise.all(profiles.map(async (p, idx) => {
        let member = await guild.members.fetch(p.userId).catch(() => null);
        let user = member?.user || await guild.client.users.fetch(p.userId).catch(() => null);
        let avatar = null;
        if (user) {
            avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 })).catch(() => null);
        }
        return {
            rank: p._rank,
            userId: p.userId,
            name: member?.displayName || user?.username || 'Unknown User',
            avatar,
            voiceSeconds: exactSeconds(p, guild.id),
            liveMs: getLiveSessionMs(p.userId, guild.id),
        };
    }));
}

export default {
    name: 'top',
    aliases: ['voicetop', 'vtop', 'leaderboard'],
    description: 'Shows the server voice-time leaderboard',
    category: 'Voice',
    usage: '&top',
    noPrefix: true,

    async execute(message, args, client) {
        const userId = message.author.id;
        const now = Date.now();
        const expiry = cooldowns.get(userId);
        if (expiry && now < expiry) {
            const left = Math.ceil((expiry - now) / 1000);
            return message.reply(` Please wait **${left}s** before using this command again.`);
        }
        cooldowns.set(userId, now + COOLDOWN_MS);

        const guild = message.guild;
        const loading = await message.reply(' Building leaderboard…');

        try {
            const allProfiles = await Profile.find({
                guildId: guild.id,
                $or: [{ voiceSeconds: { $gt: 0 } }, { voiceMinutes: { $gt: 0 } }],
            })
                .sort({ voiceSeconds: -1, voiceMinutes: -1 })
                .limit(200)
                .lean();

            if (allProfiles.length === 0) {
                return loading.edit({ content: ' No voice activity has been recorded in this server yet.' });
            }

            allProfiles.forEach((p, i) => { p._rank = i + 1; });

            const totalPages = Math.ceil(allProfiles.length / ROWS_PER_PAGE);
            let page = 0;

            const bgImage = await loadImage(BG_PATH);
            const palette = extractPalette(bgImage);

            const renderPage = async (p) => {
                const start = p * ROWS_PER_PAGE;
                const pageProfiles = allProfiles.slice(start, start + ROWS_PER_PAGE);
                const entries = await fetchEntries(guild, pageProfiles);
                const buffer = await buildTopCard({
                    guild,
                    entries,
                    page: p,
                    totalPages,
                    totalTracked: allProfiles.length,
                    bgImage,
                    palette,
                });
                return new AttachmentBuilder(buffer, { name: 'top.png' });
            };

            const buildRow = (p) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('top_prev')
                    .setLabel(' Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('top_mystats')
                    .setLabel('My Voice Time')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('top_next')
                    .setLabel('Next ')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === totalPages - 1),
                new ButtonBuilder()
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/jykbpWpcNG')
            );

            const attachment = await renderPage(page);
            await loading.edit({ content: null, files: [attachment], components: [buildRow(page)] });

            const sentMsg = await message.channel.messages.fetch(loading.id);
            const collector = sentMsg.createMessageComponentCollector({ time: 10 * 60 * 1000 });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'top_mystats') {
                    const profile = await Profile.getProfile(interaction.user.id, guild.id);
                    const mySeconds = exactSeconds(profile, guild.id);
                    const rank = await Profile.countDocuments({
                        guildId: guild.id,
                        $expr: { $gt: [{ $ifNull: ['$voiceSeconds', { $multiply: ['$voiceMinutes', 60] }] }, mySeconds] },
                    }) + 1;
                    const liveMs = getLiveSessionMs(interaction.user.id, guild.id);

                    const lines = [
                        `#  __Your Voice Stats__`,
                        ``,
                        `> **__Total Voice Time (exact):__** \`${fmtExact(mySeconds)}\``,
                        `> **__Server Rank:__** \`#${rank}\``,
                    ];
                    if (liveMs != null) {
                        lines.push(`> **__Current Session:__** \`${fmtLiveMs(liveMs)}\` and counting`);
                    } else {
                        lines.push(`> **__Status:__** Not currently in a voice channel`);
                    }

                    const container = new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(lines.join('\n'))
                    );

                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    });
                }

                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: ' Only the person who ran this command can change pages.', ephemeral: true });
                }

                if (interaction.customId === 'top_prev') page = Math.max(0, page - 1);
                if (interaction.customId === 'top_next') page = Math.min(totalPages - 1, page + 1);

                await interaction.deferUpdate();
                const newAttachment = await renderPage(page);
                await sentMsg.edit({ files: [newAttachment], components: [buildRow(page)] });
            });

            collector.on('end', async () => {
                try {
                    await sentMsg.edit({ components: [] });
                } catch {}
            });
        } catch (err) {
            console.error('[Top] Error:', err);
            await loading.edit({ content: ' Failed to build the leaderboard. Please try again.' });
        }
    },
};
