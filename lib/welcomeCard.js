import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
const FONT_REG  = path.join(__dirname, '../assets/fonts/Roboto.ttf');
const SYS_BOLD  = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const SYS_REG   = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

try { GlobalFonts.registerFromPath(FONT_BOLD, 'WelcomeBold'); } catch { try { GlobalFonts.registerFromPath(SYS_BOLD, 'WelcomeBold'); } catch {} }
try { GlobalFonts.registerFromPath(FONT_REG,  'WelcomeReg');  } catch { try { GlobalFonts.registerFromPath(SYS_REG,  'WelcomeReg');  } catch {} }

const DEFAULT_BG = path.join(__dirname, '../assets/images/top_bg.jpg');

const W = 1024;
const H = 500;

function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(167,139,250,${alpha})`;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    if (Number.isNaN(num)) return `rgba(167,139,250,${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

function drawCoverImage(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > boxRatio) {
        sh = img.height;
        sw = sh * boxRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = sw / boxRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fitText(ctx, text, maxWidth, startSize, font) {
    let size = startSize;
    ctx.font = `${size}px ${font}`;
    while (ctx.measureText(text).width > maxWidth && size > 18) {
        size -= 2;
        ctx.font = `${size}px ${font}`;
    }
    return size;
}

/**
 * Build a professional welcome card image for a new server member.
 *
 * @param {object} opts
 * @param {string} opts.avatarURL - the member's avatar URL
 * @param {string} opts.username - the member's display name/username
 * @param {string} opts.serverName - the guild's name
 * @param {number} opts.memberCount - the guild's member count (e.g. "Member #42")
 * @param {string|null} opts.backgroundURL - custom background image URL, falls back to a bundled default
 * @param {string} [opts.accentColor] - hex accent color used for the ring, title, and border
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function buildWelcomeCard({
    avatarURL,
    username,
    serverName,
    memberCount,
    backgroundURL,
    accentColor = '#A78BFA'
}) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── Background image (custom or default), scaled to cover the whole card ──
    try {
        const bgSource = backgroundURL || DEFAULT_BG;
        const bgImg = await loadImage(bgSource);
        drawCoverImage(ctx, bgImg, 0, 0, W, H);
    } catch {
        const fallback = ctx.createLinearGradient(0, 0, W, H);
        fallback.addColorStop(0, '#1a1a2e');
        fallback.addColorStop(1, '#16213e');
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, W, H);
    }

    // ── Dark overlay so all text stays readable over any background ──
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0.55)');
    overlay.addColorStop(0.5, 'rgba(0,0,0,0.45)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    // ── Outer accent border ──
    ctx.strokeStyle = hexToRgba(accentColor, 0.9);
    ctx.lineWidth = 6;
    roundRectPath(ctx, 10, 10, W - 20, H - 20, 24);
    ctx.stroke();

    // ── Avatar ──
    const avatarR = 90;
    const avatarX = W / 2;
    const avatarY = 160;

    ctx.save();
    ctx.shadowColor = hexToRgba(accentColor, 0.8);
    ctx.shadowBlur = 35;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR + 8, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(accentColor, 0.25);
    ctx.fill();
    ctx.restore();

    try {
        const avatarImg = await loadImage(avatarURL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
        ctx.restore();
    } catch {
        ctx.fillStyle = hexToRgba(accentColor, 0.6);
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(accentColor, 1);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR + 6, 0, Math.PI * 2);
    ctx.stroke();

    // ── "WELCOME" title ──
    ctx.textAlign = 'center';
    ctx.fillStyle = hexToRgba(accentColor, 1);
    ctx.font = 'bold 56px WelcomeBold';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText('WELCOME', W / 2, 320);
    ctx.shadowBlur = 0;

    // ── Username ──
    const usernameSize = fitText(ctx, username, W - 160, 42, 'WelcomeBold');
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${usernameSize}px WelcomeBold`;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText(username, W / 2, 370);
    ctx.shadowBlur = 0;

    // ── Server name / subtitle ──
    const subtitle = `has joined ${serverName}`;
    const subtitleSize = fitText(ctx, subtitle, W - 160, 26, 'WelcomeReg');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${subtitleSize}px WelcomeReg`;
    ctx.fillText(subtitle, W / 2, 408);

    // ── Member count footer ──
    if (memberCount) {
        ctx.fillStyle = hexToRgba(accentColor, 0.9);
        ctx.font = '20px WelcomeReg';
        ctx.fillText(`Member #${memberCount}`, W / 2, 450);
    }

    ctx.textAlign = 'left';
    return canvas.encode('png');
}

export default { buildWelcomeCard };
