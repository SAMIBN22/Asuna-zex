import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js'
import path from 'path'

const BG_URL = 'https://i.pinimg.com/736x/e0/5f/c6/e05fc661ac3627f4a4232cb455e1d695.jpg';

async function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

async function drawCircleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

async function generateStatsCard(guild) {
    const W = 900, H = 480;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // --- Background ---
    try {
        const bg = await loadImage(BG_URL);
        ctx.drawImage(bg, 0, 0, W, H);
    } catch {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#1a0533');
        grad.addColorStop(1, '#3b0764');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // --- Dark overlay ---
    ctx.fillStyle = 'rgba(10, 5, 25, 0.62)';
    ctx.fillRect(0, 0, W, H);

    // === LEFT PANEL — Server icon + name ===
    const panelX = 40, panelY = 50, panelW = 240, panelH = 380;
    await drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 20);
    ctx.fillStyle = 'rgba(200, 150, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 170, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Server icon
    const iconSize = 110;
    const iconX = panelX + (panelW - iconSize) / 2;
    const iconY = panelY + 30;

    // Glow ring around icon
    ctx.save();
    ctx.shadowColor = '#d8a8ff';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200, 140, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Draw icon
    try {
        const iconUrl = guild.iconURL({ extension: 'png', size: 256 });
        if (iconUrl) {
            const icon = await loadImage(iconUrl);
            await drawCircleImage(ctx, icon, iconX, iconY, iconSize);
        } else {
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } catch {
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Server name
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#f0d6ff';
    ctx.textAlign = 'center';
    const maxW = panelW - 20;
    let name = guild.name;
    while (ctx.measureText(name).width > maxW && name.length > 1) {
        name = name.slice(0, -1);
    }
    if (name !== guild.name) name += '…';
    ctx.fillText(name, panelX + panelW / 2, iconY + iconSize + 30);

    // Divider
    ctx.strokeStyle = 'rgba(200, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, iconY + iconSize + 45);
    ctx.lineTo(panelX + panelW - 20, iconY + iconSize + 45);
    ctx.stroke();

    // Server ID label
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(210,180,255,0.6)';
    ctx.fillText('SERVER ID', panelX + panelW / 2, iconY + iconSize + 65);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#dbb8ff';
    ctx.fillText(guild.id, panelX + panelW / 2, iconY + iconSize + 84);

    // Created date
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(210,180,255,0.6)';
    ctx.fillText('CREATED', panelX + panelW / 2, iconY + iconSize + 110);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#dbb8ff';
    const created = guild.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    ctx.fillText(created, panelX + panelW / 2, iconY + iconSize + 128);

    // === RIGHT PANEL — Stats ===
    const rX = 310, rY = 50, rW = 550, rH = 380;
    await drawRoundedRect(ctx, rX, rY, rW, rH, 20);
    ctx.fillStyle = 'rgba(200, 150, 255, 0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 170, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px sans-serif';
    const titleGrad = ctx.createLinearGradient(rX + 25, 0, rX + 300, 0);
    titleGrad.addColorStop(0, '#f0c4ff');
    titleGrad.addColorStop(1, '#c084fc');
    ctx.fillStyle = titleGrad;
    ctx.fillText('Server Statistics', rX + 25, rY + 48);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(200,170,255,0.55)';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(today, rX + 25, rY + 70);

    // Divider
    ctx.strokeStyle = 'rgba(200,150,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rX + 20, rY + 82);
    ctx.lineTo(rX + rW - 20, rY + 82);
    ctx.stroke();

    // --- Stats grid (2 columns x 3 rows) ---
    await guild.members.fetch().catch(() => {});

    const total    = guild.memberCount;
    const online   = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline' && !m.user.bot).size;
    const offline  = guild.members.cache.filter(m => (!m.presence || m.presence.status === 'offline') && !m.user.bot).size;
    const inVoice  = guild.members.cache.filter(m => m.voice.channel).size;
    const boosts   = guild.premiumSubscriptionCount || 0;
    const tier     = guild.premiumTier || 0;

    const stats = [
        { icon: '', label: 'Total Members', value: total.toLocaleString() },
        { icon: '', label: 'Online',         value: online.toLocaleString() },
        { icon: '', label: 'Offline',        value: offline.toLocaleString() },
        { icon: '', label: 'In Voice',       value: inVoice.toLocaleString() },
        { icon: '', label: 'Boosts',         value: boosts.toLocaleString() },
        { icon: '', label: 'Boost Tier',     value: `Tier ${tier}` },
    ];

    const colW = (rW - 40) / 2;
    const rowH = 90;
    const startY = rY + 100;

    for (let i = 0; i < stats.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = rX + 20 + col * colW;
        const by = startY + row * rowH;
        const bw = colW - 12;
        const bh = 74;

        // Stat box
        await drawRoundedRect(ctx, bx, by, bw, bh, 14);
        ctx.fillStyle = 'rgba(180, 120, 255, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 150, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.font = '13px sans-serif';
        ctx.fillStyle = 'rgba(210,180,255,0.65)';
        ctx.textAlign = 'left';
        ctx.fillText(`${stats[i].icon}  ${stats[i].label}`, bx + 14, by + 24);

        // Value
        ctx.font = 'bold 26px sans-serif';
        const valGrad = ctx.createLinearGradient(bx, 0, bx + 150, 0);
        valGrad.addColorStop(0, '#f5d0ff');
        valGrad.addColorStop(1, '#b78dfa');
        ctx.fillStyle = valGrad;
        ctx.fillText(stats[i].value, bx + 14, by + 58);
    }

    // Bottom accent line
    const lineGrad = ctx.createLinearGradient(0, H - 5, W, H - 5);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.3, '#c084fc');
    lineGrad.addColorStop(0.7, '#e879f9');
    lineGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, H - 4, W, 4);

    return canvas.toBuffer('image/png');
}

export default {
    name: 'stats2',
    aliases: ['serverstats2', 'ss2'],
    description: 'Show a beautiful server statistics card',
    cooldown: 5,

    async execute(message) {
        const isOwner = message.author.id === message.guild.ownerId;
        const hasHighPerms = message.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isOwner && !hasHighPerms) return;

        const { guild } = message;

        const loading = await message.channel.send(' Generating stats card...');

        try {
            const buffer = await generateStatsCard(guild);
            const attachment = new AttachmentBuilder(buffer, { name: 'server-stats.png' });

            await message.channel.send({ files: [attachment] });
            await loading.delete().catch(() => {});
            try { await message.delete(); } catch (e) {}

        } catch (err) {
            console.error('[STATS2]', err);
            await loading.edit(' Failed to generate stats card.').catch(() => {});
        }
    }
};
