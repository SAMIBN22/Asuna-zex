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
import { fileURLToPath } from 'url';
import path from 'path';
import Profile from '../../../models/profile.js';
import config  from '../../../config/config.js';

// ── Fonts ─────────────────────────────────────────────────────────────────────
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD   = path.join(__dirname, '../../../assets/fonts/Roboto-Bold.ttf');
const FONT_REG    = path.join(__dirname, '../../../assets/fonts/Roboto.ttf');
const SYS_BOLD    = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const SYS_REG     = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
try { GlobalFonts.registerFromPath(FONT_BOLD, 'RkBold'); } catch { try { GlobalFonts.registerFromPath(SYS_BOLD, 'RkBold'); } catch {} }
try { GlobalFonts.registerFromPath(FONT_REG,  'RkReg');  } catch { try { GlobalFonts.registerFromPath(SYS_REG,  'RkReg');  } catch {} }

// ── Constants ─────────────────────────────────────────────────────────────────
const OWNER_IDS   = (config.devIds || []).map(String);
const cooldowns   = new Map();
const COOLDOWN_MS = 10_000;
const W           = 820;
const H           = 290;

// ── Warm palette (matches &lvl) ───────────────────────────────────────────────
const ACCENT_GOLD = '#F4C96A';
const ACCENT_ROSE = '#F0907A';

// ── Background image (cached) ─────────────────────────────────────────────────
const __bgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../assets/lvl_bg.jpg');
let _bgImage = null;
async function getBgImage() {
    if (!_bgImage) _bgImage = await loadImage(__bgPath).catch(() => null);
    return _bgImage;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const stripSMP = str =>
    [...(str || '')].filter(ch => ch.codePointAt(0) <= 0xFFFF).join('').trim();

function fmtVoice(minutes) {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtNum(n) {
    if (n >= 1_000_000) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

/** Returns [ "12 Jan 2024", "19:35 UTC" ] */
function fmtJoin(date) {
    if (!date) return ['Unknown', ''];
    const d  = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateLine = `${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const timeLine = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
    return [dateLine, timeLine];
}

// ── Draw the rank overlay onto the prepared canvas ───────────────────────────
function drawOverlay(ctx, member, profile, rank, imgs) {
    const isOwner = OWNER_IDS.includes(member.user.id) || profile.infiniteCredits === true;

    /* ── Layout constants ────────────────────────────────────────────────────
       AVR  = avatar radius          AVX/AVY = avatar centre
       NX   = text start X           NY      = display-name baseline
       LY   = divider-line Y
       SY   = stats block top
    */
    const AVR = 76, AVX = 108, AVY = H / 2 - 2;
    const NX  = AVX + AVR + 30;
    const NY  = 78;
    const LY  = NY + 54;
    const SY  = LY + 22;

    // ── 1. Dark overlays for readability ─────────────────────────────────────
    ctx.fillStyle = 'rgba(10,6,2,0.55)';
    ctx.fillRect(0, 0, W, H);

    // Left panel (behind avatar)
    const lp = ctx.createLinearGradient(0, 0, 240, 0);
    lp.addColorStop(0,   'rgba(8,4,0,0.75)');
    lp.addColorStop(0.75,'rgba(8,4,0,0.25)');
    lp.addColorStop(1,   'rgba(8,4,0,0)');
    ctx.fillStyle = lp;
    ctx.fillRect(0, 0, 240, H);

    // Bottom strip (behind stats)
    const bp = ctx.createLinearGradient(0, H - 120, 0, H);
    bp.addColorStop(0, 'rgba(8,4,0,0)');
    bp.addColorStop(1, 'rgba(8,4,0,0.82)');
    ctx.fillStyle = bp;
    ctx.fillRect(0, H - 120, W, 120);

    // Top strip
    const tp = ctx.createLinearGradient(0, 0, 0, 60);
    tp.addColorStop(0, 'rgba(8,4,0,0.55)');
    tp.addColorStop(1, 'rgba(8,4,0,0)');
    ctx.fillStyle = tp;
    ctx.fillRect(0, 0, W, 60);

    // ── 2. Avatar ─────────────────────────────────────────────────────────────
    // Outer warm gold glow
    const ag = ctx.createRadialGradient(AVX, AVY, AVR - 10, AVX, AVY, AVR + 36);
    ag.addColorStop(0,   'rgba(244,201,106,0.50)');
    ag.addColorStop(0.55,'rgba(240,144,122,0.18)');
    ag.addColorStop(1,   'rgba(240,144,122,0)');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 36, 0, Math.PI * 2); ctx.fill();

    // Dashed gold ring
    ctx.save();
    ctx.strokeStyle = 'rgba(244,201,106,0.82)';
    ctx.lineWidth   = 2.8;
    ctx.setLineDash([16, 7]);
    ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 14, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Solid warm inner border
    ctx.save();
    ctx.strokeStyle = 'rgba(253,246,236,0.80)';
    ctx.lineWidth   = 2.2;
    ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Avatar image
    if (imgs.avatar) {
        ctx.save();
        ctx.beginPath(); ctx.arc(AVX, AVY, AVR, 0, Math.PI * 2);
        ctx.closePath(); ctx.clip();
        ctx.drawImage(imgs.avatar, AVX - AVR, AVY - AVR, AVR * 2, AVR * 2);
        ctx.restore();
    }

    // Discord avatar decoration
    if (imgs.deco) {
        const ds = (AVR + 26) * 2;
        ctx.drawImage(imgs.deco, AVX - ds / 2, AVY - ds / 2, ds, ds);
    }

    // ── 3. Display name & username ────────────────────────────────────────────
    // Try each name source separately so stripSMP fallback works correctly
    let dname = stripSMP(member.displayName)
             || stripSMP(member.user.globalName)
             || stripSMP(member.user.username)
             || 'User';
    if (dname.length > 19) dname = dname.slice(0, 18) + '…';
    const handle = '@' + (stripSMP(member.user.username) || 'user');

    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur  = 14;

    // Display name – warm white
    ctx.font      = 'bold 38px RkBold, sans-serif';
    ctx.fillStyle = '#FDF6EC';
    ctx.fillText(dname, NX, NY);

    // Username – warm sand
    ctx.font      = '16px RkReg, sans-serif';
    ctx.fillStyle = 'rgba(240,210,170,0.80)';
    ctx.fillText(handle, NX, NY + 28);

    ctx.shadowBlur = 0;

    // ── 4. Warm gold divider line ──────────────────────────────────────────────
    const LX1 = NX;
    const LX2 = W - 32;

    ctx.save();
    ctx.shadowColor = 'rgba(244,201,106,0.75)';
    ctx.shadowBlur  = 16;
    const baseGrad = ctx.createLinearGradient(LX1, 0, LX2, 0);
    baseGrad.addColorStop(0,   'rgba(240,144,122,0)');
    baseGrad.addColorStop(0.08,'rgba(244,201,106,0.90)');
    baseGrad.addColorStop(0.92,'rgba(244,201,106,0.90)');
    baseGrad.addColorStop(1,   'rgba(240,144,122,0)');
    ctx.strokeStyle = baseGrad;
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.moveTo(LX1, LY); ctx.lineTo(LX2, LY); ctx.stroke();
    ctx.restore();

    // ── 5. Four stats columns ────────────────────────────────────────────────
    const LW  = LX2 - LX1;
    const [joinDate, joinTime] = fmtJoin(member.joinedAt);
    const voiceStr = fmtVoice(profile.voiceMinutes || 0);
    const msgStr   = fmtNum(profile.messageCount   || 0);
    const rankStr  = `#${rank}`;

    const cols = [
        { label: 'MEMBER SINCE', line1: joinDate, line2: joinTime },
        { label: 'RANK',         value: rankStr  },
        { label: 'VOICE TIME',   value: voiceStr },
        { label: 'MESSAGES',     value: msgStr   },
    ];

    const colW = LW / cols.length;

    for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const cx  = LX1 + i * colW + colW / 2;

        // Column separator
        if (i > 0) {
            const sg = ctx.createLinearGradient(0, SY, 0, SY + 70);
            sg.addColorStop(0,   'rgba(244,201,106,0)');
            sg.addColorStop(0.5, 'rgba(244,201,106,0.35)');
            sg.addColorStop(1,   'rgba(244,201,106,0)');
            ctx.strokeStyle = sg;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(LX1 + i * colW, SY);
            ctx.lineTo(LX1 + i * colW, SY + 72);
            ctx.stroke();
        }

        // Label — warm parchment
        ctx.font      = 'bold 10px RkBold, sans-serif';
        ctx.fillStyle = 'rgba(244,201,106,0.78)';
        const lw = ctx.measureText(col.label).width;
        ctx.fillText(col.label, Math.round(cx - lw / 2), SY + 13);

        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur  = 10;

        if (col.value !== undefined) {
            ctx.font      = 'bold 30px RkBold, sans-serif';
            ctx.fillStyle = '#FDF6EC';
            const vw = ctx.measureText(col.value).width;
            ctx.fillText(col.value, Math.round(cx - vw / 2), SY + 50);
        } else {
            ctx.font      = 'bold 14px RkBold, sans-serif';
            ctx.fillStyle = '#FDF6EC';
            const dw = ctx.measureText(col.line1).width;
            ctx.fillText(col.line1, Math.round(cx - dw / 2), SY + 40);

            ctx.font      = '12px RkReg, sans-serif';
            ctx.fillStyle = 'rgba(240,210,170,0.82)';
            const tw = ctx.measureText(col.line2).width;
            ctx.fillText(col.line2, Math.round(cx - tw / 2), SY + 57);
        }

        ctx.shadowBlur = 0;
    }

    // ── 6. Owner badge ──────────────────────────────────────────────────────────
    if (isOwner) {
        ctx.font      = 'bold 11px RkBold, sans-serif';
        ctx.fillStyle = ACCENT_GOLD;
        ctx.shadowColor = 'rgba(0,0,0,0.90)';
        ctx.shadowBlur  = 8;
        ctx.fillText(' OWNER  ·  ∞ Credits', NX, NY + 54);
        ctx.shadowBlur = 0;
    }
}

// ── Build rank card (static PNG, warm lvl_bg.jpg background) ─────────────────
async function buildRankCard(member, profile, rank) {
    const imgs = {};
    await Promise.allSettled([
        loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
            .then(i => { imgs.avatar = i; }).catch(() => {}),

        member.user.avatarDecorationData?.asset
            ? loadImage(
                `https://cdn.discordapp.com/avatar-decoration-presets/${member.user.avatarDecorationData.asset}.png?size=160&passthrough=true`
              ).then(i => { imgs.deco = i; }).catch(() => {})
            : Promise.resolve(),
    ]);

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    // ── Background: lvl_bg.jpg cover-fit ─────────────────────────────────────
    const bgImg = await getBgImage();
    if (bgImg) {
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const bw = bgImg.width * scale;
        const bh = bgImg.height * scale;
        ctx.drawImage(bgImg, (W - bw) / 2, (H - bh) / 2, bw, bh);
    } else {
        const fb = ctx.createLinearGradient(0, 0, W, H);
        fb.addColorStop(0, '#3B2A1A');
        fb.addColorStop(1, '#1A1208');
        ctx.fillStyle = fb;
        ctx.fillRect(0, 0, W, H);
    }

    // Vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.40)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    drawOverlay(ctx, member, profile, rank, imgs);
    return { buffer: canvas.toBuffer('image/png'), ext: 'png' };
}

// ── Command export ────────────────────────────────────────────────────────────
export default {
    name:        'r',
    aliases:     ['rank', 'stats', 'level'],
    description: 'Show your animated rank card',
    category:    'General',
    usage:       '&r [@user]',
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

        const loading = await message.reply(' Building rank card…');

        try {
            const [profile, rank] = await Promise.all([
                Profile.getProfile(targetUser.id, message.guild.id),
                Profile.getRank(targetUser.id, message.guild.id),
            ]);

            const { buffer, ext } = await buildRankCard(member, profile, rank);
            const attachment = new AttachmentBuilder(buffer, { name: `rank.${ext}` });
            
            const supportButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/jykbpWpcNG')
            );
            
            await loading.edit({ content: null, files: [attachment], components: [supportButton] });
        } catch (err) {
            console.error('[Rank] Error:', err);
            await loading.edit({ content: ' Failed to generate rank card. Please try again.' });
        }
    },
};
