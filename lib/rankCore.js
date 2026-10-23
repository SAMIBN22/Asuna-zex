import { AttachmentBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import RankSystemConfig from '../models/rankSystemConfig.js';
import UserRankTime     from '../models/userRankTime.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTimeInSeconds(amount, unit) {
    const m = { second: 1, minute: 60, hour: 3600, day: 86400 };
    return amount * (m[unit] || 60);
}

export function formatTime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || !parts.length) parts.push(`${s}s`);
    return parts.join(' ');
}

// ── Level-up check & save ─────────────────────────────────────────────────────

export async function checkAndApplyLevelUp(guildId, userId) {
    const cfg      = await RankSystemConfig.getForGuild(guildId);
    if (!cfg.enabled) return null;

    const user     = await UserRankTime.get(userId, guildId);
    const required = getTimeInSeconds(cfg.timeAmount, cfg.timeUnit);
    const expected = Math.floor(user.totalTime / required);

    if (expected > user.level) {
        const oldLevel = user.level;
        user.level = expected;
        await user.save();
        return { oldLevel, newLevel: expected };
    }
    return null;
}

// ── Level-up card ─────────────────────────────────────────────────────────────

async function buildLevelUpCard(member, oldLevel, newLevel) {
    const canvas = createCanvas(800, 300);
    const ctx    = canvas.getContext('2d');

    // background gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 300);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 300);

    // decorative circles
    ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
    ctx.beginPath(); ctx.arc(700, 50, 120, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(100, 280, 80,  0, Math.PI * 2); ctx.fill();

    // avatar
    try {
        const avatarURL = member.user.displayAvatarURL({ size: 256, extension: 'png' });
        const img = await loadImage(avatarURL);
        ctx.save();
        ctx.beginPath(); ctx.arc(150, 150, 75, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(img, 75, 75, 150, 150);
        ctx.restore();
    } catch {
        ctx.fillStyle = '#7289DA';
        ctx.beginPath(); ctx.arc(150, 150, 75, 0, Math.PI * 2); ctx.fill();
    }

    // avatar ring
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(150, 150, 79, 0, Math.PI * 2); ctx.stroke();

    // LEVEL UP title
    ctx.fillStyle = '#FFD700';
    ctx.font      = 'bold 52px Arial';
    ctx.fillText('LEVEL UP!', 270, 85);

    // username
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 30px Arial';
    ctx.fillText(member.user.username, 270, 130);

    // level change
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font      = '24px Arial';
    ctx.fillText(`Level ${oldLevel}`, 270, 185);
    ctx.fillStyle = '#FFD700';
    ctx.font      = 'bold 28px Arial';
    ctx.fillText('→', 400, 185);
    ctx.fillText(`Level ${newLevel}`, 450, 185);

    // congrats
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font      = '18px Arial';
    ctx.fillText('Congratulations on reaching a new level!', 270, 235);

    return canvas.encode('png');
}

// ── Send level-up message ─────────────────────────────────────────────────────

export async function sendLevelUpMessage(client, guildId, userId, oldLevel, newLevel) {
    try {
        const cfg = await RankSystemConfig.getForGuild(guildId);
        if (!cfg.rankChannel) return;

        const guild   = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(cfg.rankChannel);
        const member  = await guild?.members.fetch(userId).catch(() => null);
        if (!channel || !member) return;

        const buf        = await buildLevelUpCard(member, oldLevel, newLevel);
        const attachment = new AttachmentBuilder(buf, { name: 'levelup.png' });
        await channel.send({ content: `<@${userId}>`, files: [attachment] });
    } catch (e) {
        console.error('[Rank] sendLevelUpMessage error:', e.message);
    }
}

// ── Rank card for &myrank ─────────────────────────────────────────────────────

export async function buildRankCard(member, user, cfg) {
    const required       = getTimeInSeconds(cfg.timeAmount, cfg.timeUnit);
    const progressTime   = user.totalTime % required;
    const progressPct    = Math.min(100, (progressTime / required) * 100);

    const canvas = createCanvas(900, 300);
    const ctx    = canvas.getContext('2d');

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 900, 300);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 300);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(800, 50, 120, 0, Math.PI * 2); ctx.fill();

    // Card background
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.roundRect(20, 20, 860, 260, 20);
    ctx.fill();

    // Avatar
    try {
        const img = await loadImage(member.user.displayAvatarURL({ size: 256, extension: 'png' }));
        ctx.save();
        ctx.beginPath(); ctx.arc(120, 150, 70, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(img, 50, 80, 140, 140);
        ctx.restore();
    } catch {
        ctx.fillStyle = '#7289DA';
        ctx.beginPath(); ctx.arc(120, 150, 70, 0, Math.PI * 2); ctx.fill();
    }

    // Avatar ring
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(120, 150, 74, 0, Math.PI * 2); ctx.stroke();

    // Username
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 30px Arial';
    ctx.fillText(member.user.username, 220, 75);

    // Level badge
    ctx.fillStyle = '#FFD700';
    ctx.font      = 'bold 28px Arial';
    ctx.fillText(`Level ${user.level}`, 220, 115);

    // Stats
    const stats = [
        ['Total Time', formatTime(user.totalTime)],
        ['Voice Time', formatTime(user.voiceTime)],
        ['Text Time',  formatTime(user.textTime)],
    ];
    stats.forEach(([label, value], i) => {
        const y = 155 + i * 30;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font      = '18px Arial';
        ctx.fillText(`${label}:`, 220, y);
        ctx.fillStyle = '#FFD700';
        ctx.font      = 'bold 18px Arial';
        ctx.fillText(value, 370, y);
    });

    // Progress bar bg
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(220, 248, 640, 22, 11); ctx.fill();

    // Progress bar fill
    const pGrad = ctx.createLinearGradient(220, 0, 860, 0);
    pGrad.addColorStop(0, '#FFD700');
    pGrad.addColorStop(1, '#FFA500');
    ctx.fillStyle = pGrad;
    ctx.beginPath(); ctx.roundRect(220, 248, Math.max(22, (640 * progressPct) / 100), 22, 11); ctx.fill();

    // Progress text
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 13px Arial';
    ctx.fillText(
        `${progressPct.toFixed(1)}%  —  ${formatTime(progressTime)} / ${formatTime(required)}  until Level ${user.level + 1}`,
        230, 263,
    );

    return canvas.encode('png');
}
