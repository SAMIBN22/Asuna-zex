import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import path from 'path';
import Profile from '../../../models/profile.js';

// ── Fonts ─────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD = path.join(__dirname, '../../../assets/fonts/Roboto-Bold.ttf');
const FONT_REG  = path.join(__dirname, '../../../assets/fonts/Roboto.ttf');
const SYS_BOLD  = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const SYS_REG   = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
try { GlobalFonts.registerFromPath(FONT_BOLD, 'LvlBold'); } catch { try { GlobalFonts.registerFromPath(SYS_BOLD, 'LvlBold'); } catch {} }
try { GlobalFonts.registerFromPath(FONT_REG,  'LvlReg');  } catch { try { GlobalFonts.registerFromPath(SYS_REG,  'LvlReg');  } catch {} }

// ── Constants ─────────────────────────────────────────────────────────────────
const W           = 1000;
const H           = 382;
const cooldowns   = new Map();
const COOLDOWN_MS = 6_000;

const VOICE_COLOR = '#F4C96A'; // warm gold  — matches sandy image palette
const TEXT_COLOR  = '#F0907A'; // warm rose  — complementary warm accent

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripSMP(str) {
    return [...(str || '')].filter(ch => ch.codePointAt(0) <= 0xFFFF).join('').trim();
}

function fmtNum(n) {
    return Math.max(0, Math.floor(n || 0)).toLocaleString('en-US');
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawProgressBar(ctx, x, y, w, h, ratio, color, current, required) {
    // Track
    drawRoundedRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();

    // Fill
    const fillW = Math.max(h, w * Math.min(1, Math.max(0, ratio)));
    if (fillW > 0) {
        ctx.save();
        drawRoundedRect(ctx, x, y, w, h, h / 2);
        ctx.clip();
        const grad = ctx.createLinearGradient(x, 0, x + fillW, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(255,255,255,0.85)');
        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        drawRoundedRect(ctx, x, y, fillW, h, h / 2);
        ctx.fill();
        ctx.restore();
    }

    // Centered "current / required" label
    ctx.font = 'bold 13px LvlBold, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    const label = `${fmtNum(current)} / ${fmtNum(required)}`;
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, x + w / 2 - lw / 2, y + h / 2 + 4);
    ctx.shadowBlur = 0;
}

function drawTrackBlock(ctx, { x, y, w, label, color, level, rank, xp, required, current }) {
    // Label
    ctx.font = 'bold 13px LvlBold, sans-serif';
    ctx.fillStyle = 'rgba(240,210,170,0.80)';   // warm parchment
    ctx.fillText(label.toUpperCase(), x, y);

    // Level + rank
    ctx.font = 'bold 30px LvlBold, sans-serif';
    ctx.fillStyle = '#FDF6EC';                   // warm white
    ctx.fillText(`Level ${level}`, x, y + 38);
    const levelW = ctx.measureText(`Level ${level}`).width;

    ctx.font = '17px LvlReg, sans-serif';
    ctx.fillStyle = 'rgba(220,185,145,0.85)';   // warm sand
    ctx.fillText(`#${rank}`, x + levelW + 8, y + 38);

    // XP (right aligned)
    ctx.font = 'bold 20px LvlBold, sans-serif';
    ctx.fillStyle = color;
    const xpStr = `${fmtNum(xp)} XP`;
    const xw = ctx.measureText(xpStr).width;
    ctx.fillText(xpStr, x + w - xw, y + 32);

    // Progress bar
    drawProgressBar(ctx, x, y + 52, w, 26, current / required, color, current, required);
}

// ── Background image (loaded once) ────────────────────────────────────────────
const __bgPath = path.join(__dirname, '../../../assets/lvl_bg.jpg');
let _bgImage = null;
async function getBgImage() {
    if (!_bgImage) _bgImage = await loadImage(__bgPath).catch(() => null);
    return _bgImage;
}

async function buildLvlCard({ member, voice, text }) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Card background ───────────────────────────────────────────────────
    drawRoundedRect(ctx, 0, 0, W, H, 26);
    ctx.save();
    ctx.clip();

    // Draw the Pinterest image scaled to cover the entire card
    const bgImg = await getBgImage();
    if (bgImg) {
        // Cover-fit: scale so the image fills W×H, centered
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const bw = bgImg.width * scale;
        const bh = bgImg.height * scale;
        ctx.drawImage(bgImg, (W - bw) / 2, (H - bh) / 2, bw, bh);
    } else {
        // Fallback gradient if image fails to load
        const fb = ctx.createLinearGradient(0, 0, W, H);
        fb.addColorStop(0, '#3B2A1A');
        fb.addColorStop(1, '#1A1208');
        ctx.fillStyle = fb;
        ctx.fillRect(0, 0, W, H);
    }

    // Dark overlay so text remains readable over the warm image
    ctx.fillStyle = 'rgba(10, 6, 2, 0.58)';
    ctx.fillRect(0, 0, W, H);

    // Subtle warm vignette at edges
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Border highlight
    ctx.restore();
    drawRoundedRect(ctx, 1, 1, W - 2, H - 2, 25);
    ctx.strokeStyle = 'rgba(244,201,106,0.25)';   // warm gold border
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Avatar ────────────────────────────────────────────────────────────
    const AVR = 78, AVX = 148, AVY = H / 2;
    const glow = ctx.createRadialGradient(AVX, AVY, AVR - 10, AVX, AVY, AVR + 34);
    glow.addColorStop(0, 'rgba(244,201,106,0.50)');   // warm gold glow
    glow.addColorStop(1, 'rgba(244,201,106,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 34, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(AVX, AVY, AVR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (member.avatar) ctx.drawImage(member.avatar, AVX - AVR, AVY - AVR, AVR * 2, AVR * 2);
    else { ctx.fillStyle = 'rgba(120,100,80,0.6)'; ctx.fillRect(AVX - AVR, AVY - AVR, AVR * 2, AVR * 2); }
    ctx.restore();

    ctx.strokeStyle = 'rgba(244,201,106,0.90)';   // warm gold ring
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(AVX, AVY, AVR + 3, 0, Math.PI * 2); ctx.stroke();

    // ── Username ──────────────────────────────────────────────────────────
    const NX = AVX + AVR + 46;
    ctx.font = 'bold 40px LvlBold, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    let name = stripSMP(member.name);
    if (name.length > 22) name = name.slice(0, 21) + '…';
    ctx.fillText(name, NX, 66);
    ctx.shadowBlur = 0;

    // ── Track blocks ──────────────────────────────────────────────────────
    const blockW = W - NX - 46;
    drawTrackBlock(ctx, {
        x: NX, y: 118, w: blockW,
        label: 'Voice Experience', color: VOICE_COLOR,
        level: voice.level, rank: voice.rank, xp: voice.xp,
        required: voice.required, current: voice.xp,
    });
    drawTrackBlock(ctx, {
        x: NX, y: 232, w: blockW,
        label: 'Text Experience', color: TEXT_COLOR,
        level: text.level, rank: text.rank, xp: text.xp,
        required: text.required, current: text.xp,
    });

    // Footer
    ctx.font = '13px LvlReg, sans-serif';
    ctx.fillStyle = 'rgba(230,200,160,0.65)';   // warm sand muted
    const footer = 'Stay active in voice and text channels to earn XP and level up';
    const fw = ctx.measureText(footer).width;
    ctx.fillText(footer, W / 2 - fw / 2, H - 20);

    return canvas.toBuffer('image/png');
}

export default {
    name: 'lvl',
    aliases: ['levels', 'xp', 'exp'],
    description: 'Shows your Voice and Text experience card with levels, XP, and server rank',
    category: 'General',
    usage: '&lvl [@user]',
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

        const targetUser = args[0] ? await resolveMember(message, args[0]) : message.member;
        if (!targetUser) return message.reply(' User not found in this server.');
        const memberObj = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (!memberObj) return message.reply(' User not found in this server.');

        const loading = await message.reply(' Building level card…');

        try {
            const profile = await Profile.getProfile(targetUser.id, message.guild.id);
            const [voiceRank, textRank] = await Promise.all([
                Profile.getVoiceRank(targetUser.id, message.guild.id),
                Profile.getTextRank(targetUser.id, message.guild.id),
            ]);

            const avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 })).catch(() => null);

            const voice = {
                level: profile.voiceLevel || 1,
                xp: profile.voiceXp || 0,
                required: Profile.getRequiredTrackXp(profile.voiceLevel || 1),
                rank: voiceRank,
            };
            const text = {
                level: profile.textLevel || 1,
                xp: profile.textXp || 0,
                required: Profile.getRequiredTrackXp(profile.textLevel || 1),
                rank: textRank,
            };

            const buffer = await buildLvlCard({
                member: { name: memberObj.displayName || targetUser.username, avatar },
                voice, text,
            });
            const attachment = new AttachmentBuilder(buffer, { name: 'lvl.png' });

            await loading.edit({
                content: '',
                files: [attachment],
            });
        } catch (err) {
            console.error('[Lvl] Error:', err);
            await loading.edit({ content: ' Failed to generate the level card. Please try again.' });
        }
    },
};
