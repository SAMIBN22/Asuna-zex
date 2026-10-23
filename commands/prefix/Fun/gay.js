import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
/**
 * &gay — Gay percentage card with canvas rendering.
 * Usage: &gay | &gay @user | &gay <userId>
 */
import {
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
} from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';

// ── Fonts ──────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD = path.join(__dirname, '../../../assets/fonts/Roboto-Bold.ttf');
const FONT_REG  = path.join(__dirname, '../../../assets/fonts/Roboto.ttf');
try { GlobalFonts.registerFromPath(FONT_BOLD, 'TwBold'); } catch {
    try { GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'TwBold'); } catch {}
}
try { GlobalFonts.registerFromPath(FONT_REG, 'TwReg'); } catch {
    try { GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'TwReg'); } catch {}
}

const BG_URL = 'https://i.pinimg.com/1200x/cb/90/43/cb9043c1b3ce663785bb66e571b55126.jpg';

// ── Helpers ────────────────────────────────────────────────────────────────────
async function fetchBuf(url) {
    try {
        const res = await fetch(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
    } catch { return null; }
}

function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Daily-consistent seed so the same user gets the same % on the same day. */
function getGayPercent(userId) {
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = userId + dateStr;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = Math.imul(31, hash) + key.charCodeAt(i) | 0;
    }
    return Math.abs(hash) % 101; // 0–100
}

// ── Card builder ───────────────────────────────────────────────────────────────
async function buildGayCard({ avatarUrl, decorationUrl, displayName, username, pct }) {
    const W = 820, H = 260;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    // Background image
    const bgBuf = await fetchBuf(BG_URL);
    if (bgBuf) {
        try {
            const bgImg = await loadImage(bgBuf);
            ctx.drawImage(bgImg, 0, 0, W, H);
        } catch { /* fallback below */ }
    }

    // Dark overlay for readability
    ctx.fillStyle = 'rgba(8, 4, 18, 0.52)';
    ctx.fillRect(0, 0, W, H);

    // Left purple–pink gradient flush
    const lg = ctx.createLinearGradient(0, 0, 230, 0);
    lg.addColorStop(0, 'rgba(160, 30, 200, 0.60)');
    lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);

    // Avatar position
    const AV_X = 118, AV_Y = 130, AV_R = 74;

    // Outer glow ring
    ctx.save();
    ctx.shadowColor   = '#e040fb';
    ctx.shadowBlur    = 18;
    ctx.strokeStyle   = '#e040fb';
    ctx.lineWidth     = 4;
    ctx.beginPath();
    ctx.arc(AV_X, AV_Y, AV_R + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Avatar circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(AV_X, AV_Y, AV_R, 0, Math.PI * 2);
    ctx.clip();
    const avBuf = await fetchBuf(avatarUrl);
    if (avBuf) {
        try {
            const avImg = await loadImage(avBuf);
            ctx.drawImage(avImg, AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
        } catch {}
    } else {
        // Placeholder
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(AV_X - AV_R, AV_Y - AV_R, AV_R * 2, AV_R * 2);
    }
    ctx.restore();

    // Avatar decoration (if present)
    if (decorationUrl) {
        const decBuf = await fetchBuf(decorationUrl);
        if (decBuf) {
            try {
                const decImg = await loadImage(decBuf);
                const pad = 20;
                ctx.drawImage(decImg,
                    AV_X - AV_R - pad, AV_Y - AV_R - pad,
                    (AV_R + pad) * 2,  (AV_R + pad) * 2);
            } catch {}
        }
    }

    // ── Text area ──────────────────────────────────────────────────────────────
    const TX = 225;

    // Title "[Name]'s Rate ‍"
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 27px TwBold';
    const title   = `${displayName}'s Rate`;
    ctx.fillText(title, TX, 62);

    // Rainbow flag drawn as tiny bars right after the title
    const tw = ctx.measureText(title).width;
    const rb = [
        '#E40303', '#FF8C00', '#FFED00',
        '#008026', '#004DFF', '#750787',
    ];
    const RW = 10, RH = 18, RS = 2;
    let rx = TX + tw + 12;
    const ry = 46;
    rb.forEach(c => {
        ctx.fillStyle = c;
        ctx.fillRect(rx, ry, RW, RH);
        rx += RW + RS;
    });

    // Subtitle
    ctx.fillStyle = 'rgba(210, 180, 230, 0.80)';
    ctx.font      = '15px TwReg';
    ctx.fillText(`Let's see how gay ${username} is...`, TX, 90);

    // Large percentage
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 70px TwBold';
    ctx.fillText(`${pct}%`, TX, 170);

    // Progress bar
    const BAR_X = TX, BAR_Y = 188, BAR_W = 460, BAR_H = 22, BAR_R = 11;

    // Track
    ctx.save();
    rrect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_R);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
    ctx.restore();

    // Fill
    const fillW = Math.max(BAR_R * 2, Math.round((pct / 100) * BAR_W));
    ctx.save();
    rrect(ctx, BAR_X, BAR_Y, fillW, BAR_H, BAR_R);
    const grd = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
    grd.addColorStop(0,   '#ff4dac');
    grd.addColorStop(0.5, '#c030e0');
    grd.addColorStop(1,   '#7c3aed');
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();

    // "Gay Percentage" label
    ctx.fillStyle = 'rgba(200, 170, 220, 0.70)';
    ctx.font      = '13px TwReg';
    ctx.fillText('Gay Percentage', BAR_X, BAR_Y + BAR_H + 18);

    // Branding bottom-right
    const brand = 'zex';
    ctx.font      = '12px TwReg';
    ctx.fillStyle = 'rgba(180, 150, 200, 0.55)';
    ctx.fillText(brand, W - ctx.measureText(brand).width - 14, H - 14);

    return canvas.toBuffer('image/png');
}

// ── Command ────────────────────────────────────────────────────────────────────
export default {
    name:        'gay',
    aliases:     ['howgay', 'gaymeter', 'gayrate'],
    description: 'Check how gay someone is with a fancy card',
    category:    'Fun',
    usage:       '&gay [@user]',
    guildOnly:   true,

    async execute(message, args, client) {
        const theme  = await client.themeManager.getTheme(message.guild.id);
        const accent = theme.color ?? 0x9B59B6;

        // ── Resolve target ─────────────────────────────────────────────────────
        let targetUser = message.author;
        let targetMember = message.member;

        if (message.mentions.users.size > 0) {
            targetUser   = message.mentions.users.first();
            targetMember = await resolveMember(message, args[0]) || targetMember;
        } else if (args[0] && /^\d{15,20}$/.test(args[0])) {
            try {
                targetMember = await message.guild.members.fetch(args[0]);
                targetUser   = targetMember.user;
            } catch {
                const errContainer = new ContainerBuilder()
                    .setAccentColor(accent)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##  __User Not Found__\n> Could not find that user in this server.`
                        )
                    );
                return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
            }
        }

        // ── Generate card ──────────────────────────────────────────────────────
        await message.channel.sendTyping().catch(() => {});

        const avatarUrl = targetUser.displayAvatarURL({ size: 256, extension: 'png', forceStatic: true });
        const decorationUrl = targetUser.avatarDecorationURL?.({ size: 128 }) ?? null;
        const pct = getGayPercent(targetUser.id);

        let cardBuf;
        try {
            cardBuf = await buildGayCard({
                avatarUrl,
                decorationUrl,
                displayName: targetMember?.displayName || targetUser.displayName || targetUser.username,
                username:    targetUser.username,
                pct,
            });
        } catch (err) {
            console.error('[GayCard] Canvas error:', err);
            const errContainer = new ContainerBuilder()
                .setAccentColor(accent)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `##  __Card Error__\n> Failed to generate the card. Please try again.`
                    )
                );
            return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const attachment = new AttachmentBuilder(cardBuf, { name: 'gay-rate.png' });

        const container = new ContainerBuilder()
            .setAccentColor(accent)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ‍ __Gay Rate — ${targetMember?.displayName || targetUser.username}__`)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(item => item.setURL('attachment://gay-rate.png'))
            );

        return message.reply({
            files:      [attachment],
            components: [container],
            flags:      MessageFlags.IsComponentsV2,
        });
    },
};
