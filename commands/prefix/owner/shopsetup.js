/**
 * &shopsetup <#channel|channelId> <imageUrl> <price> [name...]
 *
 * Owner-only command. Sends an animated shop panel to the chosen channel.
 * Users can click Buy to purchase the background for their profile card.
 */

import {
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
} from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';
import ShopConfig from '../../../models/shopConfig.js';
import GpPermission from '../../../models/gpPermission.js';
import config     from '../../../config/config.js';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD   = path.join(__dirname, '../../../assets/fonts/Roboto-Bold.ttf');
const FONT_REG    = path.join(__dirname, '../../../assets/fonts/Roboto.ttf');
const SYS_BOLD    = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
try { GlobalFonts.registerFromPath(FONT_BOLD, 'ShopBold'); } catch { try { GlobalFonts.registerFromPath(SYS_BOLD, 'ShopBold'); } catch {} }

const require   = createRequire(import.meta.url);
const { parseGIF, decompressFrames } = require('gifuct-js');

const OWNER_IDS = (config.devIds || []).map(String);
const W = 820, H = 300;

// ── Render a preview card (static PNG, first frame if GIF) ───────────────────
async function buildPreview(bgUrl, shopName, price) {
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    // Try load background
    let bgImg = null;
    try {
        const res = await fetch(bgUrl, { timeout: 10_000 });
        const buf = Buffer.from(await res.arrayBuffer());
        const ct  = res.headers.get('content-type') || '';

        if (ct.includes('gif')) {
            // Decode first frame only
            const gif    = parseGIF(buf);
            const frames = decompressFrames(gif, true);
            if (frames.length) {
                const f   = frames[0];
                const fc  = createCanvas(f.dims.width, f.dims.height);
                const fct = fc.getContext('2d');
                const id  = fct.createImageData(f.dims.width, f.dims.height);
                id.data.set(f.patch);
                fct.putImageData(id, 0, 0);
                bgImg = fc;
            }
        } else {
            bgImg = await loadImage(buf);
        }
    } catch { /* fallback gradient */ }

    if (bgImg) {
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const bw = bgImg.width * scale, bh = bgImg.height * scale;
        ctx.drawImage(bgImg, (W - bw) / 2, (H - bh) / 2, bw, bh);
    } else {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#0a0020'); g.addColorStop(1, '#001535');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);

    // Bottom strip
    const bs = ctx.createLinearGradient(0, H - 130, 0, H);
    bs.addColorStop(0, 'rgba(0,0,0,0)'); bs.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = bs; ctx.fillRect(0, H - 130, W, 130);

    // Top strip
    const ts = ctx.createLinearGradient(0, 0, 0, 80);
    ts.addColorStop(0, 'rgba(0,0,0,0.70)'); ts.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ts; ctx.fillRect(0, 0, W, 80);

    // ── Shop badge top-left ───────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(255,200,50,0.18)';
    roundRect(ctx, 24, 20, 180, 36, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,50,0.70)'; ctx.lineWidth = 1.5;
    roundRect(ctx, 24, 20, 180, 36, 18); ctx.stroke();
    ctx.restore();
    ctx.font = 'bold 14px ShopBold, sans-serif';
    ctx.fillStyle = '#FFD060';
    ctx.shadowColor = 'rgba(0,0,0,0.80)'; ctx.shadowBlur = 8;
    ctx.fillText('  PROFILE CARD SHOP', 38, 44);
    ctx.shadowBlur = 0;

    // ── Background name ───────────────────────────────────────────────────────
    const label = shopName.length > 30 ? shopName.slice(0, 28) + '…' : shopName;
    ctx.font = 'bold 38px ShopBold, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 14;
    ctx.fillText(label, 32, H - 88);
    ctx.shadowBlur = 0;

    // ── Glowing divider ───────────────────────────────────────────────────────
    const dg = ctx.createLinearGradient(32, 0, W - 32, 0);
    dg.addColorStop(0,   'rgba(255,190,50,0)');
    dg.addColorStop(0.1, 'rgba(255,190,50,0.80)');
    dg.addColorStop(0.9, 'rgba(255,190,50,0.80)');
    dg.addColorStop(1,   'rgba(255,190,50,0)');
    ctx.save();
    ctx.shadowColor = 'rgba(255,190,50,0.60)'; ctx.shadowBlur = 12;
    ctx.strokeStyle = dg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(32, H - 68); ctx.lineTo(W - 32, H - 68); ctx.stroke();
    ctx.restore();

    // ── Price row ─────────────────────────────────────────────────────────────
    ctx.font = '16px ShopBold, sans-serif';
    ctx.fillStyle = 'rgba(200,200,200,0.80)';
    ctx.fillText('Price', 32, H - 42);

    ctx.font = 'bold 28px ShopBold, sans-serif';
    ctx.fillStyle = '#FFD060';
    ctx.shadowColor = 'rgba(0,0,0,0.90)'; ctx.shadowBlur = 10;
    ctx.fillText(`${price.toLocaleString()} Credits`, 32, H - 16);
    ctx.shadowBlur = 0;

    // ── "Preview" watermark top-right ─────────────────────────────────────────
    ctx.font = '12px ShopBold, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.fillText('PREVIEW', W - 80, 40);

    return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
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

// ── Command ───────────────────────────────────────────────────────────────────
export default {
    name:        'shopsetup',
    aliases:     ['addshop', 'shopbg'],
    description: 'Owner: Create a background shop panel in a channel',
    category:    'Owner',
    usage:       '&shopsetup <#channel> <imageUrl> <price> [name...]',

    async execute(message, args) {
        const isOwner = OWNER_IDS.includes(message.author.id);
        if (!isOwner && !(await GpPermission.can(message.author.id, message.guild.id, 'shopsetup'))) {
            return message.reply('>  Owner only command.');
        }

        // ── Parse args ────────────────────────────────────────────────────────
        if (args.length < 3) {
            return message.reply(
                '> **Usage:** `&shopsetup <#channel> <imageUrl> <price> [name...]`\n' +
                '> **Example:** `&shopsetup #shop https://i.pinimg.com/... 500 Galaxy Night`'
            );
        }

        // Channel (mention or ID)
        const rawCh = args[0].replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(rawCh)
            || message.guild.channels.cache.find(c => c.name === args[0].replace('#', ''));
        if (!channel || !channel.isTextBased()) {
            return message.reply('>  Channel not found. Use a mention or valid channel ID.');
        }

        const bgUrl = args[1];
        if (!bgUrl.startsWith('http')) {
            return message.reply('>  Invalid image URL. Must start with `http`.');
        }

        const price = parseInt(args[2], 10);
        if (isNaN(price) || price < 0) {
            return message.reply('>  Invalid price. Must be a positive number.');
        }

        const bgName = args.slice(3).join(' ') || 'Profile Background';

        const loading = await message.reply('>  Building shop panel…');

        try {
            // ── Save to DB ────────────────────────────────────────────────────
            const shopConfig = await ShopConfig.create({
                guildId:   message.guild.id,
                channelId: channel.id,
                bgUrl,
                price,
                name: bgName,
            });

            // ── Render preview card ───────────────────────────────────────────
            const previewBuf = await buildPreview(bgUrl, bgName, price);
            const attachment = new AttachmentBuilder(previewBuf, { name: 'shop_preview.png' });

            // ── Buy button ────────────────────────────────────────────────────
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`shop_buy_${shopConfig._id}`)
                    .setLabel(`Buy — ${price.toLocaleString()} Credits`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji({ id: '1522710709946023936', name: '86782owo', animated: true })
            );

            // ── Send panel to target channel ──────────────────────────────────
            const panel = await channel.send({ files: [attachment], components: [row] });

            // ── Save message ID ───────────────────────────────────────────────
            shopConfig.messageId = panel.id;
            await shopConfig.save();

            await loading.edit(
                `>  Shop panel **"${bgName}"** sent to ${channel}!\n` +
                `> Price: **${price.toLocaleString()} Credits** · ID: \`${shopConfig._id}\``
            );
        } catch (err) {
            console.error('[ShopSetup]', err);
            await loading.edit('>  Failed to create shop panel. Check the image URL and try again.');
        }
    },
};
