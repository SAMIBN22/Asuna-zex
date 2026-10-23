import {
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';
import fetch from 'node-fetch';
import Profile    from '../../../models/profile.js';
import ClanConfig from '../../../models/clanConfig.js';
import config     from '../../../config/config.js';

// ── Fonts ─────────────────────────────────────────────────────────────────────
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD   = path.join(__dirname, '../../../assets/fonts/Roboto-Bold.ttf');
const FONT_REG    = path.join(__dirname, '../../../assets/fonts/Roboto.ttf');
const SYSTEM_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
try { GlobalFonts.registerFromPath(FONT_BOLD,   'CardBold'); }   catch { try { GlobalFonts.registerFromPath(SYSTEM_BOLD, 'CardBold'); } catch {} }
try { GlobalFonts.registerFromPath(FONT_REG,    'CardReg');  }   catch {}

// ── gifuct-js (CJS) ───────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const { parseGIF, decompressFrames } = require('gifuct-js');

// ── Constants ─────────────────────────────────────────────────────────────────
const OWNER_IDS   = (config.devIds || []).map(String);
const cooldowns   = new Map();
const COOLDOWN_MS = 15_000;
const BG_URL      = 'https://i.pinimg.com/originals/cd/2e/77/cd2e775f2b16b72949a9413366223529.gif';
const W = 820, H = 300;
const MAX_FRAMES  = 22;   // cap for performance
const QUALITY     = 14;   // gif quality (lower = better quality, slower)

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
    if (n >= 1_000_000_000) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1_000_000)     return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)         return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}
const stripSMP = str =>
    [...(str || '')].filter(ch => ch.codePointAt(0) <= 0xFFFF).join('').trim();

// ── Decode animated GIF → array of composited full-frame ImageDatas ───────────
async function decodeGif(buf) {
    const gif       = parseGIF(buf);
    const rawFrames = decompressFrames(gif, true);
    const gw = gif.lsd.width, gh = gif.lsd.height;

    // Persistent composite canvas (exact GIF dimensions)
    const comp    = createCanvas(gw, gh);
    const compCtx = comp.getContext('2d');

    // Scale-to-fill transform for card size
    const scale = Math.max(W / gw, H / gh);
    const ox = (W - gw * scale) / 2;
    const oy = (H - gh * scale) / 2;

    const frames = [];
    for (let i = 0; i < Math.min(rawFrames.length, MAX_FRAMES); i++) {
        const { dims, patch, delay, disposalType } = rawFrames[i];

        // Render patch onto composite canvas
        const p    = createCanvas(dims.width, dims.height);
        const pCtx = p.getContext('2d');
        const id   = pCtx.createImageData(dims.width, dims.height);
        id.data.set(patch);
        pCtx.putImageData(id, 0, 0);
        compCtx.drawImage(p, dims.left, dims.top);

        // Scale-to-fill into card canvas
        const card    = createCanvas(W, H);
        const cardCtx = card.getContext('2d');
        cardCtx.drawImage(comp, ox, oy, gw * scale, gh * scale);

        frames.push({
            imageData: cardCtx.getImageData(0, 0, W, H),
            delay:     Math.max((delay || 10) * 10, 40),  // centiseconds → ms
        });

        // Disposal type 2 = restore background behind patch
        if (disposalType === 2)
            compCtx.clearRect(dims.left, dims.top, dims.width, dims.height);
    }
    return frames;
}

// ── Color extraction from background ─────────────────────────────────────────
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function toHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Sample an ImageData and return a colour palette derived from the
 * background's dominant hue. Falls back to gold if the image is too dark/grey.
 */
function extractPalette(imageData) {
    const data = imageData.data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    // Sample every 60th pixel (fast, representative)
    for (let i = 0; i < data.length; i += 240) {
        const a = data[i + 3];
        if (a < 100) continue;
        rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
        count++;
    }
    if (!count) return goldPalette();

    const avgR = rSum / count, avgG = gSum / count, avgB = bSum / count;
    let [h, s, l] = rgbToHsl(avgR, avgG, avgB);

    // If nearly greyscale or very dark → fall back to gold
    if (s < 0.10) return goldPalette();

    // Boost saturation, fix lightness for legible bright text
    s = Math.min(s * 1.5, 1);

    // Primary accent — vivid, bright
    const [r1, g1, b1] = hslToRgb(h, s, 0.78);
    const accent = toHex(r1, g1, b1);

    // Secondary — slightly muted
    const [r2, g2, b2] = hslToRgb(h, s * 0.85, 0.65);
    const sub = toHex(r2, g2, b2);

    // Glow / border colours (rgba strings)
    const [hr, hg, hb] = hslToRgb(h, s, 0.60);
    const glow   = `rgba(${hr},${hg},${hb},0.50)`;
    const border  = `rgba(${hr},${hg},${hb},0.90)`;
    const divider = `rgba(${hr},${hg},${hb},0.65)`;
    const label   = `rgba(${r2},${g2},${b2},0.78)`;
    const sep     = `rgba(${hr},${hg},${hb},0.50)`;

    return { accent, sub, glow, border, divider, label, sep };
}

function goldPalette() {
    return {
        accent:  '#FFD97D',
        sub:     'rgba(255,215,120,0.68)',
        glow:    'rgba(255,185,50,0.48)',
        border:  'rgba(255,210,80,0.92)',
        divider: 'rgba(255,190,60,0.65)',
        label:   'rgba(255,195,90,0.78)',
        sep:     'rgba(255,190,60,0.50)',
    };
}

// ── Draw card overlay (synchronous – all images pre-loaded) ───────────────────
function drawOverlay(ctx, member, profile, rank, clan, imgs, isOwner, palette) {
    const P = palette || goldPalette();

    // ── 1. Semi-transparent dark vignette ───────────────────────────────────
    // left panel
    const lg = ctx.createLinearGradient(0, 0, W * 0.65, 0);
    lg.addColorStop(0,   'rgba(4,6,18,0.85)');
    lg.addColorStop(0.8, 'rgba(4,6,18,0.45)');
    lg.addColorStop(1,   'rgba(4,6,18,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);

    // bottom strip
    const bg = ctx.createLinearGradient(0, H - 100, 0, H);
    bg.addColorStop(0, 'rgba(4,6,18,0)');
    bg.addColorStop(1, 'rgba(4,6,18,0.80)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, H - 100, W, 100);

    // top strip
    const tg = ctx.createLinearGradient(0, 0, 0, 80);
    tg.addColorStop(0, 'rgba(4,6,18,0.60)');
    tg.addColorStop(1, 'rgba(4,6,18,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, 80);

    // ── 2. Server icon – top-right small circle ──────────────────────────────
    const ICR = 30, ICX = W - 52, ICY = 48;
    if (imgs.icon) {
        ctx.save();
        // glow
        const ig = ctx.createRadialGradient(ICX, ICY, ICR - 4, ICX, ICY, ICR + 14);
        ig.addColorStop(0,   P.glow);
        ig.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(ICX, ICY, ICR + 14, 0, Math.PI * 2); ctx.fill();
        // border
        ctx.strokeStyle = P.border;
        ctx.lineWidth   = 2.5;
        ctx.beginPath(); ctx.arc(ICX, ICY, ICR + 1, 0, Math.PI * 2); ctx.stroke();
        // clip & draw
        ctx.beginPath(); ctx.arc(ICX, ICY, ICR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(imgs.icon, ICX - ICR, ICY - ICR, ICR * 2, ICR * 2);
        ctx.restore();
    }

    // ── 3. Avatar – left, large circle ──────────────────────────────────────
    const AVR = 76, ACX = 110, ACY = H / 2 - 4;

    // outer glow ring
    const ag = ctx.createRadialGradient(ACX, ACY, AVR - 8, ACX, ACY, AVR + 28);
    ag.addColorStop(0,   P.glow);
    ag.addColorStop(0.6, 'rgba(0,0,0,0.10)');
    ag.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(ACX, ACY, AVR + 28, 0, Math.PI * 2); ctx.fill();

    // accent border
    ctx.save();
    ctx.strokeStyle = P.border;
    ctx.lineWidth   = 3.5;
    ctx.beginPath(); ctx.arc(ACX, ACY, AVR + 4, 0, Math.PI * 2); ctx.stroke();
    // inner thin ring
    ctx.strokeStyle = P.sub;
    ctx.lineWidth   = 1.2;
    ctx.beginPath(); ctx.arc(ACX, ACY, AVR + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // avatar image
    if (imgs.avatar) {
        ctx.save();
        ctx.beginPath(); ctx.arc(ACX, ACY, AVR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(imgs.avatar, ACX - AVR, ACY - AVR, AVR * 2, AVR * 2);
        ctx.restore();
    }

    // decoration overlay (if the user has a Discord avatar decoration)
    if (imgs.deco) {
        const ds = (AVR + 22) * 2;
        ctx.drawImage(imgs.deco, ACX - ds / 2, ACY - ds / 2, ds, ds);
    }

    // ── 4. Display name + username ───────────────────────────────────────────
    const NX = ACX + AVR + 26;
    const NY = ACY - 32;

    let dname = stripSMP(member.displayName || member.user.username)
             || member.user.username.slice(0, 16)
             || 'User';
    if (dname.length > 18) dname = dname.slice(0, 17) + '…';
    const handle = '@' + (stripSMP(member.user.username) || 'user');

    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur  = 10;

    ctx.font      = 'bold 36px CardBold, CardReg, sans-serif';
    ctx.fillStyle = P.accent;
    ctx.fillText(dname, NX, NY);

    ctx.font      = '15px CardReg, sans-serif';
    ctx.fillStyle = P.sub;
    ctx.fillText(handle, NX, NY + 26);

    if (isOwner) {
        ctx.font      = 'bold 12px CardBold, sans-serif';
        ctx.fillStyle = P.accent;
        ctx.fillText('OWNER  ·  Unlimited Credits', NX, NY + 52);
    }

    ctx.shadowBlur = 0;

    // ── 5. Divider line ──────────────────────────────────────────────────────
    const DY = H - 96;
    const div = ctx.createLinearGradient(20, 0, W - 20, 0);
    div.addColorStop(0,    'rgba(0,0,0,0)');
    div.addColorStop(0.25, P.divider);
    div.addColorStop(0.75, P.divider);
    div.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.strokeStyle = div;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(20, DY); ctx.lineTo(W - 20, DY); ctx.stroke();

    // ── 6. Stats row: CREDITS · RANK · CLAN ─────────────────────────────────
    const SY      = H - 55;
    const credits  = isOwner ? '∞' : fmt(profile.credits || 0);
    const rankTxt  = `#${rank}`;
    const clanName = clan
        ? (clan.name.length > 13 ? clan.name.slice(0, 12) + '…' : clan.name)
        : 'No Clan';

    function stat(label, value, cx) {
        ctx.font      = 'bold 10px CardBold, sans-serif';
        ctx.fillStyle = P.label;
        const lw = ctx.measureText(label).width;
        ctx.fillText(label, cx - lw / 2, SY);

        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur  = 8;
        ctx.font        = 'bold 28px CardBold, sans-serif';
        ctx.fillStyle   = '#FFFFFF';
        const vw = ctx.measureText(value).width;
        ctx.fillText(value, cx - vw / 2, SY + 32);
        ctx.shadowBlur  = 0;
    }

    // three equal columns
    stat('CREDITS', credits,  Math.round(W * 0.26));
    stat('RANK',    rankTxt,  Math.round(W * 0.50));
    stat('CLAN',    clanName, Math.round(W * 0.75));

    // subtle vertical separators between stats
    for (const sx of [Math.round(W * 0.375), Math.round(W * 0.625)]) {
        const sg = ctx.createLinearGradient(0, SY - 6, 0, SY + 36);
        sg.addColorStop(0,   'rgba(0,0,0,0)');
        sg.addColorStop(0.5, P.sep);
        sg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.strokeStyle = sg;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(sx, SY - 6); ctx.lineTo(sx, SY + 36); ctx.stroke();
    }
}

// ── Build animated GIF card ───────────────────────────────────────────────────
async function buildCard(member, profile, rank, clan, guild) {
    const isOwner = OWNER_IDS.includes(member.user.id) || profile.infiniteCredits === true;

    // Pre-load images (once, reused across every frame)
    const imgs = {};
    await Promise.allSettled([
        loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
            .then(i => { imgs.avatar = i; }).catch(() => {}),

        guild.iconURL({ extension: 'png', size: 128 })
            ? loadImage(guild.iconURL({ extension: 'png', size: 128 }))
                .then(i => { imgs.icon = i; }).catch(() => {})
            : Promise.resolve(),

        member.user.avatarDecorationData?.asset
            ? loadImage(`https://cdn.discordapp.com/avatar-decoration-presets/${member.user.avatarDecorationData.asset}.png?size=160&passthrough=true`)
                .then(i => { imgs.deco = i; }).catch(() => {})
            : Promise.resolve(),
    ]);

    // Fetch & decode background (GIF or static image)
    let gifFrames = null;
    let staticBg  = null;
    try {
        const activeBgUrl = profile.activeBg || BG_URL;
        const res = await fetch(activeBgUrl, { timeout: 10_000 });
        const buf = Buffer.from(await res.arrayBuffer());

        // Detect GIF by magic bytes: G I F
        const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
        if (isGif) {
            gifFrames = await decodeGif(buf);
        } else {
            staticBg = await loadImage(buf);
        }
    } catch { /* fallback below */ }

    // ── Extract colour palette from the first available frame/image ──────────
    let palette = goldPalette();
    try {
        if (gifFrames?.length) {
            palette = extractPalette(gifFrames[0].imageData);
        } else if (staticBg) {
            // Draw staticBg onto a tiny canvas to sample pixels
            const sc  = createCanvas(W, H);
            const sct = sc.getContext('2d');
            const scale = Math.max(W / staticBg.width, H / staticBg.height);
            const bw = staticBg.width * scale, bh = staticBg.height * scale;
            sct.drawImage(staticBg, (W - bw) / 2, (H - bh) / 2, bw, bh);
            palette = extractPalette(sct.getImageData(0, 0, W, H));
        }
    } catch { /* keep gold palette */ }

    // ── Static fallback (dark bg) or static image bg ─────────────────────────
    if (!gifFrames?.length) {
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        if (staticBg) {
            const scale = Math.max(W / staticBg.width, H / staticBg.height);
            const bw    = staticBg.width  * scale;
            const bh    = staticBg.height * scale;
            ctx.drawImage(staticBg, (W - bw) / 2, (H - bh) / 2, bw, bh);
        } else {
            ctx.fillStyle = '#070b1e';
            ctx.fillRect(0, 0, W, H);
        }
        drawOverlay(ctx, member, profile, rank, clan, imgs, isOwner, palette);
        return { buffer: canvas.toBuffer('image/png'), ext: 'png' };
    }

    // ── Animated GIF output ───────────────────────────────────────────────────
    const encoder = new GIFEncoder(W, H, 'neuquant', true, gifFrames.length);
    const chunks  = [];
    const stream  = encoder.createReadStream();
    stream.on('data', chunk => chunks.push(chunk));

    const done = new Promise((resolve, reject) => {
        stream.on('end',   resolve);
        stream.on('error', reject);
    });

    encoder.setRepeat(0);
    encoder.setQuality(QUALITY);
    encoder.start();

    for (const frame of gifFrames) {
        encoder.setDelay(frame.delay);
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.putImageData(frame.imageData, 0, 0);
        drawOverlay(ctx, member, profile, rank, clan, imgs, isOwner, palette);
        encoder.addFrame(ctx);
    }

    encoder.finish();
    await done;

    return { buffer: Buffer.concat(chunks), ext: 'gif' };
}

// ── Command export ────────────────────────────────────────────────────────────
export default {
    name:        'p',
    aliases:     ['profile', 'pro', 'card'],
    description: 'Display your animated profile card',
    category:    'General',
    usage:       '&p [@user]',
    noPrefix:    true,

    async execute(message, args, client) {
        const userId = message.author.id;
        const now    = Date.now();

        const expiry = cooldowns.get(userId);
        if (expiry && now < expiry) {
            const left = Math.ceil((expiry - now) / 1000);
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            ` Please wait **${left}s** before using this command again.`
                        )
                    ),
                ],
            });
        }
        cooldowns.set(userId, now + COOLDOWN_MS);

        const targetUser = message.mentions.users.first() || message.author;
        const member     = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return message.reply(' User not found in this server.');

        const loading = await message.reply(' Building profile card…');

        try {
            const [profile, rank, clan] = await Promise.all([
                Profile.getProfile(targetUser.id, message.guild.id),
                Profile.getRank(targetUser.id, message.guild.id),
                ClanConfig.findOne({
                    $or: [
                        { members:   targetUser.id },
                        { leaders:   targetUser.id },
                        { coLeaders: targetUser.id },
                    ],
                }).catch(() => null),
            ]);

            const { buffer, ext } = await buildCard(member, profile, rank, clan, message.guild);
            const attachment = new AttachmentBuilder(buffer, { name: `profile.${ext}` });
            
            const supportButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/jykbpWpcNG')
            );
            
            await loading.edit({ content: null, files: [attachment], components: [supportButton] });
        } catch (err) {
            console.error('[Profile] Error:', err);
            await loading.edit({ content: ' Failed to generate profile card. Please try again.' });
        }
    },
};
