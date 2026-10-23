import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Fonts ─────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
const FONT_REG  = path.join(__dirname, '../assets/fonts/Roboto.ttf');
const SYS_BOLD  = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const SYS_REG   = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
try { GlobalFonts.registerFromPath(FONT_BOLD, 'LbTextBold'); } catch { try { GlobalFonts.registerFromPath(SYS_BOLD, 'LbTextBold'); } catch {} }
try { GlobalFonts.registerFromPath(FONT_REG,  'LbTextReg');  } catch { try { GlobalFonts.registerFromPath(SYS_REG,  'LbTextReg');  } catch {} }

// ── Constants ─────────────────────────────────────────────────────────────────
export const ROWS_PER_PAGE = 8;
const ROW_H         = 66;
const HEADER_H      = 150;
const FOOTER_H      = 46;
const W             = 920;
const H             = HEADER_H + ROWS_PER_PAGE * ROW_H + FOOTER_H;
const ACCENT        = '#A78BFA'; // violet — matches "Text Experience" on &lvl

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripSMP(str) {
    return [...(str || '')].filter(ch => ch.codePointAt(0) <= 0xFFFF).join('').trim();
}

export function fmtNum(n) {
    n = Math.max(0, Math.floor(n || 0));
    if (n >= 1_000_000) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
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

function drawBackground(ctx) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#241F45');
    bg.addColorStop(0.55, '#1D1A3D');
    bg.addColorStop(1, '#141330');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const c1 = ctx.createRadialGradient(W - 60, 40, 10, W - 60, 40, 160);
    c1.addColorStop(0, 'rgba(167,139,250,0.25)');
    c1.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.arc(W - 60, 40, 160, 0, Math.PI * 2); ctx.fill();

    const c2 = ctx.createRadialGradient(60, H - 30, 10, 60, H - 30, 140);
    c2.addColorStop(0, 'rgba(120,110,255,0.18)');
    c2.addColorStop(1, 'rgba(120,110,255,0)');
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.arc(60, H - 30, 140, 0, Math.PI * 2); ctx.fill();
}

export async function buildTextLbCard({ guild, entries, page, totalPages, totalTracked }) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawBackground(ctx);

    // ── Header ──────────────────────────────────────────────────────────────
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 40px LbTextBold, sans-serif';
    ctx.fillStyle = '#F4F6FB';
    ctx.fillText('TEXT LEADERBOARD', 36, 62);

    ctx.font = '18px LbTextReg, sans-serif';
    ctx.fillStyle = 'rgba(200,190,240,0.75)';
    ctx.fillText(stripSMP(guild.name), 36, 90);
    ctx.shadowBlur = 0;

    const lineGrad = ctx.createLinearGradient(36, 0, W - 36, 0);
    lineGrad.addColorStop(0, ACCENT);
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(36, 108);
    ctx.lineTo(W - 36, 108);
    ctx.stroke();

    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 13px LbTextBold, sans-serif';
    ctx.fillStyle = 'rgba(200,190,240,0.75)';
    ctx.fillText(`${totalTracked} MEMBERS TRACKED  ·  PAGE ${page + 1}/${totalPages}`, 36, 132);
    ctx.shadowBlur = 0;

    // ── Rows ────────────────────────────────────────────────────────────────
    let rowY = HEADER_H;
    for (let i = 0; i < ROWS_PER_PAGE; i++) {
        const entry = entries[i];
        const y = rowY + i * ROW_H;
        if (!entry) continue;

        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(24, y + 6, W - 48, ROW_H - 12);

        const centerY = y + ROW_H / 2;
        const medal = medalColor(entry.rank);

        // Rank badge
        ctx.beginPath();
        ctx.arc(64, centerY, 20, 0, Math.PI * 2);
        ctx.fillStyle = medal || 'rgba(167,139,250,0.35)';
        ctx.fill();
        ctx.font = 'bold 16px LbTextBold, sans-serif';
        ctx.fillStyle = medal ? '#1A1A1A' : '#F4F6FB';
        const rankStr = `#${entry.rank}`;
        const rw = ctx.measureText(rankStr).width;
        ctx.fillText(rankStr, 64 - rw / 2, centerY + 5);

        // Avatar
        drawAvatarCircle(ctx, entry.avatar, 118, centerY, 22);
        ctx.strokeStyle = medal || ACCENT;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(118, centerY, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Name
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.font = 'bold 19px LbTextBold, sans-serif';
        ctx.fillStyle = '#F4F6FB';
        let name = stripSMP(entry.name);
        if (name.length > 24) name = name.slice(0, 23) + '…';
        ctx.fillText(name, 154, centerY - 3);

        // Level
        ctx.font = '12px LbTextReg, sans-serif';
        ctx.fillStyle = 'rgba(200,190,240,0.8)';
        ctx.fillText(`Level ${entry.level}`, 154, centerY + 16);
        ctx.shadowBlur = 0;

        // XP (right aligned)
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 22px LbTextBold, sans-serif';
        ctx.fillStyle = '#F4F6FB';
        const timeStr = `${fmtNum(entry.textTotalXp)} XP`;
        const tw = ctx.measureText(timeStr).width;
        ctx.fillText(timeStr, W - 44 - tw, centerY + 7);
        ctx.shadowBlur = 0;
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    ctx.font = '12px LbTextReg, sans-serif';
    ctx.fillStyle = 'rgba(200,190,240,0.65)';
    ctx.fillText('Text XP is earned by sending messages in text channels', 36, H - 18);

    return canvas.toBuffer('image/png');
}

export async function fetchEntries(guild, profiles) {
    return Promise.all(profiles.map(async (p) => {
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
            level: p.textLevel || 1,
            textTotalXp: p.textTotalXp || 0,
        };
    }));
}
