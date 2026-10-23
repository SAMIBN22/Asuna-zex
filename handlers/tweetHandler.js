/**
 * tweetHandler.js
 * Handles all interactions for the Tweets System:
 *   tweet_setup_*        → admin setup panel buttons
 *   tweet_modal_configure → save channel config from modal
 *   tweet_manage_*       → settings toggle buttons
 *   tweet_panel_dark/light → open tweet modal for users
 *   tweet_modal_dark/light → generate tweet card + post to tweet channel
 */

import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    AttachmentBuilder,
    MessageFlags,
    PermissionsBitField,
} from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';
import TweetConfig  from '../models/tweetConfig.js';
import config       from '../config/config.js';
import themeManager from '../themes/themeManager.js';

// ── Fonts ─────────────────────────────────────────────────────────────────────
const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const FONT_BOLD  = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
const FONT_REG   = path.join(__dirname, '../assets/fonts/Roboto.ttf');
const SYS_BOLD   = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const SYS_REG    = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
try { GlobalFonts.registerFromPath(FONT_BOLD, 'TwBold'); } catch { try { GlobalFonts.registerFromPath(SYS_BOLD, 'TwBold'); } catch {} }
try { GlobalFonts.registerFromPath(FONT_REG,  'TwReg');  } catch { try { GlobalFonts.registerFromPath(SYS_REG,  'TwReg');  } catch {} }

const OWNER_IDS = (config.devIds || []).map(String);

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasAccess(member) {
    if (!member) return false;
    if (OWNER_IDS.includes(String(member.user.id))) return true;
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

function parseChannelId(raw) {
    raw = (raw || '').trim();
    const m = raw.match(/^<#(\d+)>$/) || raw.match(/^(\d{17,20})$/);
    return m ? m[1] : null;
}

function fmtStat(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function fetchBuf(url) {
    try {
        const res = await fetch(url, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
    } catch { return null; }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Wrap text to lines, honouring newlines, capped at maxLines.
 *  Falls back to character-level chunking for unbroken tokens wider than maxW. */
function wrapText(ctx, text, maxW, maxLines = 8) {
    const paras = String(text).split(/\r?\n/);
    const out   = [];

    const pushWord = (word) => {
        // If a single word is wider than maxW, split it character by character
        if (ctx.measureText(word).width <= maxW) return [word];
        const chunks = [];
        let chunk = '';
        for (const ch of word) {
            const test = chunk + ch;
            if (ctx.measureText(test).width > maxW && chunk) { chunks.push(chunk); chunk = ch; }
            else chunk = test;
        }
        if (chunk) chunks.push(chunk);
        return chunks;
    };

    for (const para of paras) {
        if (!para.trim()) { out.push(''); continue; }
        const words = para.split(' ');
        let line = '';
        for (const rawW of words) {
            const subWords = pushWord(rawW);
            for (const w of subWords) {
                const test = line ? line + ' ' + w : w;
                if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
                else line = test;
            }
        }
        if (line) out.push(line);
        if (out.length >= maxLines) break;
    }
    if (out.length >= maxLines) out[maxLines - 1] = out[maxLines - 1].replace(/.{1,3}$/, '…');
    return out.slice(0, maxLines);
}

function drawVerified(ctx, x, cy) {
    ctx.save();
    ctx.fillStyle = '#1D9BF0';
    ctx.beginPath(); ctx.arc(x + 7, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + 3.5, cy + 0.5); ctx.lineTo(x + 6.2, cy + 3.2); ctx.lineTo(x + 11.5, cy - 2.8);
    ctx.stroke();
    ctx.restore();
}

function drawCircleClip(ctx, cx, cy, r) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
}

function drawReplyIcon(ctx, cx, cy, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    rrect(ctx, cx - 7, cy - 5, 14, 11, 2.5); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 6); ctx.lineTo(cx - 6, cy + 9); ctx.lineTo(cx + 1, cy + 6);
    ctx.fill(); ctx.restore();
}

function drawHeartIcon(ctx, cx, cy, color) {
    ctx.save(); ctx.fillStyle = color;
    const r = 4.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 7);
    ctx.bezierCurveTo(cx - 10, cy + 1, cx - 10, cy - 5, cx - r, cy - r * 1.1);
    ctx.arc(cx - r * 0.5, cy - r * 1.5, r, Math.PI, 0);
    ctx.arc(cx + r * 0.5, cy - r * 1.5, r, Math.PI, 0);
    ctx.bezierCurveTo(cx + 10, cy - 5, cx + 10, cy + 1, cx, cy + 7);
    ctx.fill(); ctx.restore();
}

function drawEyeIcon(ctx, cx, cy, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy);
    ctx.quadraticCurveTo(cx, cy - 7, cx + 9, cy);
    ctx.quadraticCurveTo(cx, cy + 7, cx - 9, cy);
    ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ── Tweet card generator ──────────────────────────────────────────────────────

export async function buildTweetCard({ mode, avatarUrl, guildIconUrl, displayName, username,
                                 content, panelChName, tweetChName, showStats, showVerified }) {
    const W          = 620;
    const PAD        = 18;   // card inner padding
    const CARD_X     = 15;
    const CARD_W     = W - CARD_X * 2;        // 590
    const INNER_W    = CARD_W - PAD * 2;      // 554
    const AV         = 48;   // avatar size
    const IC         = 30;   // guild icon size
    const LINE_H     = 22;
    const FONT       = 14;
    const HEADER_H   = 40;
    const isDark     = mode === 'dark';

    // Colours
    const BG     = isDark ? '#0D1117' : '#EFF3F4';
    const CARD   = isDark ? '#1C2630' : '#FFFFFF';
    const BORDER = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)';
    const C_NAME = isDark ? '#E7E9EA' : '#0F1419';
    const C_HAND = isDark ? '#8B98A5' : '#536471';
    const C_BODY = isDark ? '#E7E9EA' : '#0F1419';
    const C_DIV  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
    const C_STAT = isDark ? '#8B98A5' : '#536471';
    const C_MARK = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
    const C_FOOT = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.42)';

    // Pre-measure content lines
    const tmpC = createCanvas(W, 1);
    const tCtx = tmpC.getContext('2d');
    tCtx.font  = `${FONT}px TwReg, sans-serif`;
    const lines = wrapText(tCtx, content, INNER_W, 8);

    // Heights
    const STATS_H   = showStats ? (12 + 1 + 10 + 22) : 0;  // gap+divider+gap+row
    const CARD_INNER = PAD + AV + 12 + lines.length * LINE_H + STATS_H + PAD;
    const CARD_H    = CARD_INNER;
    const FOOTER_H  = 28;
    const H         = HEADER_H + CARD_H + 10 + FOOTER_H;

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, isDark ? '#0D1117' : '#EFF3F4');
    bg.addColorStop(1, isDark ? '#161B22' : '#E1E8ED');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Header text
    ctx.font = `13px TwReg, sans-serif`;
    ctx.fillStyle = C_HAND;
    ctx.fillText(`New Tweet By : @${username}`, CARD_X + PAD, 26);

    // Card rounded rect
    const CARD_Y = HEADER_H;
    ctx.save();
    rrect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 16);
    ctx.fillStyle = CARD; ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();

    // Absolute inner positions
    const IX = CARD_X + PAD;        // inner left X  = 33
    const IY = CARD_Y + PAD;        // inner top Y   = HEADER_H + 18

    // ── Avatar ────────────────────────────────────────────────────────────────
    const avCX = IX + AV / 2, avCY = IY + AV / 2;
    ctx.save(); drawCircleClip(ctx, avCX, avCY, AV / 2);
    const avBuf = avatarUrl ? await fetchBuf(avatarUrl) : null;
    if (avBuf) { const img = await loadImage(avBuf); ctx.drawImage(img, IX, IY, AV, AV); }
    else { ctx.fillStyle = '#5865F2'; ctx.fillRect(IX, IY, AV, AV); }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(avCX, avCY, AV / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // ── Guild icon (top right) ────────────────────────────────────────────────
    const icX = CARD_X + CARD_W - PAD - IC, icY = IY;
    const icCX = icX + IC / 2, icCY = icY + IC / 2;
    ctx.save(); drawCircleClip(ctx, icCX, icCY, IC / 2);
    const icBuf = guildIconUrl ? await fetchBuf(guildIconUrl) : null;
    if (icBuf) { const img = await loadImage(icBuf); ctx.drawImage(img, icX, icY, IC, IC); }
    else { ctx.fillStyle = '#5865F2'; ctx.fillRect(icX, icY, IC, IC); }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(icCX, icCY, IC / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // ── Name + handle ─────────────────────────────────────────────────────────
    const nameX = IX + AV + 10;
    const nameY = IY + 20;
    const trunc = displayName.length > 22 ? displayName.slice(0, 20) + '…' : displayName;

    ctx.font = `bold 15px TwBold, sans-serif`;
    ctx.fillStyle = C_NAME;
    ctx.fillText(trunc, nameX, nameY);

    if (showVerified) {
        const nw = ctx.measureText(trunc).width;
        drawVerified(ctx, nameX + nw + 5, nameY - 5);
    }

    ctx.font = `13px TwReg, sans-serif`;
    ctx.fillStyle = C_HAND;
    ctx.fillText(`@${username}`, nameX, IY + 38);

    // ── Content ───────────────────────────────────────────────────────────────
    const cStartY = IY + AV + 12;
    ctx.font = `${FONT}px TwReg, sans-serif`;
    ctx.fillStyle = C_BODY;
    lines.forEach((ln, i) => { if (ln) ctx.fillText(ln, IX, cStartY + i * LINE_H); });

    // ── Stats + watermark ─────────────────────────────────────────────────────
    if (showStats) {
        const divY   = cStartY + lines.length * LINE_H + 12;
        const stY    = divY + 11;   // stats center Y
        const statBL = stY + 4;     // text baseline

        // Divider
        ctx.save(); ctx.strokeStyle = C_DIV; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(IX, divY); ctx.lineTo(CARD_X + CARD_W - PAD, divY); ctx.stroke();
        ctx.restore();

        const rpl = rnd(50, 999), lks = rnd(500, 9999), vws = rnd(1000, 99999);
        const SF  = '12px TwReg, sans-serif';
        ctx.font = SF;

        if (isDark) {
            // Inline: icon → count + label
            let sx = IX;
            drawReplyIcon(ctx, sx, stY, C_STAT);
            ctx.fillStyle = C_STAT; ctx.font = SF;
            const rt = `  ${fmtStat(rpl)}  Replies`;
            ctx.fillText(rt, sx + 10, statBL); sx += 10 + ctx.measureText(rt).width + 18;

            drawHeartIcon(ctx, sx, stY, C_STAT);
            const lt = `  ${fmtStat(lks)}  Likes`;
            ctx.fillText(lt, sx + 10, statBL); sx += 10 + ctx.measureText(lt).width + 18;

            drawEyeIcon(ctx, sx, stY, C_STAT);
            ctx.fillText(`  ${fmtStat(vws)}  Views`, sx + 10, statBL);
        } else {
            // Pill buttons
            const pills = [
                { icon: (x, y) => drawReplyIcon(ctx, x, y, C_STAT), label: `${fmtStat(rpl)}  Replies` },
                { icon: (x, y) => drawHeartIcon(ctx, x, y, C_STAT), label: `${fmtStat(lks)}  Likes`   },
                { icon: (x, y) => drawEyeIcon(ctx, x, y, C_STAT),   label: `${fmtStat(vws)}  Views`   },
            ];
            let sx = IX;
            for (const p of pills) {
                const lw   = ctx.measureText(p.label).width;
                const pw   = 10 + 14 + 6 + lw + 10;
                const ph   = 22;
                const pyT  = stY - ph / 2;
                ctx.fillStyle = 'rgba(0,0,0,0.06)';
                rrect(ctx, sx, pyT, pw, ph, 11); ctx.fill();
                p.icon(sx + 10, stY);
                ctx.fillStyle = C_STAT; ctx.font = SF;
                ctx.fillText(p.label, sx + 10 + 14 + 6, statBL);
                sx += pw + 8;
            }
        }

        // Watermark
        ctx.save(); ctx.font = `italic 11px TwReg, sans-serif`;
        ctx.fillStyle = C_MARK; ctx.textAlign = 'right';
        ctx.fillText(`' Between Us <3 Tweets .`, CARD_X + CARD_W - PAD, statBL);
        ctx.textAlign = 'left'; ctx.restore();
    }

    // ── Footer outside card ───────────────────────────────────────────────────
    const footY = CARD_Y + CARD_H + 10 + 16;
    ctx.font = `12px TwReg, sans-serif`;
    ctx.fillStyle = C_FOOT;
    ctx.fillText(`You can create your tweet here : ${panelChName}  •  ${tweetChName}`, CARD_X + PAD, footY);

    return canvas.toBuffer('image/png');
}

// ── Build setup panel container (shared) ──────────────────────────────────────

function buildSetupContainer(guild, cfg, theme) {
    const accent = themeManager.getRGBColor(theme.color);
    const emojis = theme.emojis;
    const panelCh = cfg.panelChannelId ? `<#${cfg.panelChannelId}>` : '`Not set`';
    const tweetCh = cfg.tweetChannelId ? `<#${cfg.tweetChannelId}>` : '`Not set`';
    const status  = cfg.enabled ? `${emojis.yes || '✅'} Enabled` : `${emojis.no || '❌'} Disabled`;

    return new ContainerBuilder()
        .setAccentColor(accent)
        .addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(
                `## 🐦 __Tweets System — Setup Panel__\n` +
                `> Configure the tweet system for **${guild.name}**.`
            ))
            .setThumbnailAccessory(th => th.setURL(
                guild.iconURL({ extension: 'png', size: 256 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png'
            ))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `**${emojis.star || '<a:15278182396090124351:1528064846267158558>'} Status:** ${status}\n` +
            `**${emojis.star || '<a:15278182396090124351:1528064846267158558>'} Panel Channel:** ${panelCh}\n` +
            `**${emojis.star || '<a:15278182396090124351:1528064846267158558>'} Tweet Channel:** ${tweetCh}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder().setCustomId('tweet_setup_configure').setLabel('⚙️  Configure Channels').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tweet_setup_send_panel').setLabel('📤  Send Tweet Panel').setStyle(ButtonStyle.Success),
        ))
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder().setCustomId('tweet_setup_manage').setLabel('🔧  Manage Settings').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tweet_setup_status').setLabel('📊  Refresh Status').setStyle(ButtonStyle.Secondary),
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `-# ${emojis.star || '<a:15278182396090124351:1528064846267158558>'} Only members with **Administrator** or **Manage Server** can use this panel.`
        ));
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function handleTweetInteraction(interaction, client) {
    const cid   = interaction.customId;
    const guild = interaction.guild;
    if (!guild) return;

    // ── Admin setup buttons ───────────────────────────────────────────────────
    if (cid === 'tweet_setup_configure') {
        if (!hasAccess(interaction.member)) return interaction.reply({ content: '> Access denied.', ephemeral: true });
        const modal = new ModalBuilder().setCustomId('tweet_modal_configure').setTitle('⚙️  Configure Tweet Channels');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('panel_channel')
                    .setLabel('Panel Channel (ID or #mention)').setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g. 123456789012345678 or #tweet-panel').setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('tweet_channel')
                    .setLabel('Tweet Output Channel (ID or #mention)').setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g. 123456789012345678 or #tweets').setRequired(true)
            ),
        );
        return interaction.showModal(modal);
    }

    if (cid === 'tweet_setup_send_panel') {
        if (!hasAccess(interaction.member)) return interaction.reply({ content: '> Access denied.', ephemeral: true });
        return sendTweetPanel(interaction, client);
    }

    if (cid === 'tweet_setup_manage') {
        if (!hasAccess(interaction.member)) return interaction.reply({ content: '> Access denied.', ephemeral: true });
        return showManagePanel(interaction);
    }

    if (cid === 'tweet_setup_status') {
        if (!hasAccess(interaction.member)) return interaction.reply({ content: '> Access denied.', ephemeral: true });
        const cfg   = await TweetConfig.get(guild.id);
        const theme = await themeManager.getTheme(guild.id);
        return interaction.update({
            flags:      MessageFlags.IsComponentsV2,
            components: [buildSetupContainer(guild, cfg, theme)],
        });
    }

    // ── Manage panel toggles ──────────────────────────────────────────────────
    if (cid === 'tweet_manage_toggle_enabled' || cid === 'tweet_manage_toggle_stats' || cid === 'tweet_manage_toggle_verified') {
        if (!hasAccess(interaction.member)) return interaction.reply({ content: '> Access denied.', ephemeral: true });
        const cfg = await TweetConfig.get(guild.id);
        if (cid === 'tweet_manage_toggle_enabled')  cfg.enabled    = !cfg.enabled;
        if (cid === 'tweet_manage_toggle_stats')     cfg.showStats  = !cfg.showStats;
        if (cid === 'tweet_manage_toggle_verified')  cfg.showVerified = !cfg.showVerified;
        cfg.updatedAt = new Date(); await cfg.save();
        return showManagePanel(interaction, cfg);
    }

    if (cid === 'tweet_manage_back') {
        if (!hasAccess(interaction.member)) return interaction.reply({ content: '> Access denied.', ephemeral: true });
        const cfg   = await TweetConfig.get(guild.id);
        const theme = await themeManager.getTheme(guild.id);
        return interaction.update({
            flags:      MessageFlags.IsComponentsV2,
            components: [buildSetupContainer(guild, cfg, theme)],
        });
    }

    // ── Tweet panel buttons (users) ───────────────────────────────────────────
    if (cid === 'tweet_panel_dark' || cid === 'tweet_panel_light') {
        const cfg = await TweetConfig.get(guild.id);
        if (!cfg.enabled) return interaction.reply({ content: '> The tweet system is currently disabled.', ephemeral: true });
        if (!cfg.tweetChannelId) return interaction.reply({ content: '> Tweet channel not configured yet.', ephemeral: true });

        const mode  = cid === 'tweet_panel_dark' ? 'Dark' : 'Light';
        const modal = new ModalBuilder()
            .setCustomId(cid === 'tweet_panel_dark' ? 'tweet_modal_dark' : 'tweet_modal_light')
            .setTitle(`✍️  Write a ${mode} Tweet`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('tweet_content')
                    .setLabel('Your tweet').setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Share your thoughts with the community…')
                    .setMaxLength(500).setRequired(true)
            )
        );
        return interaction.showModal(modal);
    }

    // ── Modal: configure channels ─────────────────────────────────────────────
    if (cid === 'tweet_modal_configure') {
        if (!hasAccess(interaction.member)) return interaction.reply({ content: '> Access denied.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const rawPanel = interaction.fields.getTextInputValue('panel_channel');
        const rawTweet = interaction.fields.getTextInputValue('tweet_channel');
        const panelId  = parseChannelId(rawPanel);
        const tweetId  = parseChannelId(rawTweet);

        if (!panelId || !tweetId) {
            return interaction.editReply({ content: '> ❌ Invalid channel. Use a channel mention (`#channel`) or a valid channel ID.' });
        }

        // Validate channels exist and are text-sendable
        const panelCh = guild.channels.cache.get(panelId) || await guild.channels.fetch(panelId).catch(() => null);
        const tweetCh = guild.channels.cache.get(tweetId) || await guild.channels.fetch(tweetId).catch(() => null);
        if (!panelCh || !panelCh.isTextBased()) return interaction.editReply({ content: `> ❌ Panel channel \`${panelId}\` not found or is not a text channel.` });
        if (!tweetCh || !tweetCh.isTextBased()) return interaction.editReply({ content: `> ❌ Tweet channel \`${tweetId}\` not found or is not a text channel.` });

        const cfg = await TweetConfig.get(guild.id);
        cfg.panelChannelId = panelId;
        cfg.tweetChannelId = tweetId;
        cfg.updatedAt = new Date();
        await cfg.save();

        return interaction.editReply({
            content:
                `> ✅ **Channels configured!**\n` +
                `> 📌 Panel Channel: <#${panelId}>\n` +
                `> 📨 Tweet Channel: <#${tweetId}>\n` +
                `> Use **📤 Send Tweet Panel** to post the panel to <#${panelId}>.`,
        });
    }

    // ── Modal: submit tweet ───────────────────────────────────────────────────
    if (cid === 'tweet_modal_dark' || cid === 'tweet_modal_light') {
        return postTweet(interaction, client, cid === 'tweet_modal_dark' ? 'dark' : 'light');
    }
}

// ── Send tweet panel to panel channel ────────────────────────────────────────

async function sendTweetPanel(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const cfg   = await TweetConfig.get(guild.id);

    if (!cfg.panelChannelId) {
        return interaction.editReply({ content: '> ❌ Panel channel not configured. Click **⚙️ Configure Channels** first.' });
    }

    const ch = guild.channels.cache.get(cfg.panelChannelId) ||
               await guild.channels.fetch(cfg.panelChannelId).catch(() => null);
    if (!ch) return interaction.editReply({ content: '> ❌ Panel channel not found. Please reconfigure.' });

    // Build the media URL (banner > icon > bot avatar)
    const mediaUrl = guild.bannerURL({ extension: 'png', size: 1024 }) ||
                     guild.iconURL({ extension: 'png', size: 512 }) ||
                     client.user.displayAvatarURL({ extension: 'png', size: 512 });

    const panel = new ContainerBuilder()
        .setAccentColor([29, 155, 240])   // Twitter blue
        .addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(
                `## 🐦 __${guild.name}'s Tweets System__`
            ))
            .setThumbnailAccessory(th => th.setURL(
                guild.iconURL({ extension: 'png', size: 256 }) ||
                client.user.displayAvatarURL({ extension: 'png' })
            ))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `> **Share your thoughts with the community!**`
        ))
        .addTextDisplayComponents(t => t.setContent(
            `Click the button below to write a new tweet!`
        ));

    if (mediaUrl) {
        panel.addMediaGalleryComponents(g => g.addItems(item => item.setURL(mediaUrl)));
    }

    panel
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder().setCustomId('tweet_panel_dark').setLabel('🌑  Dark Tweet').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tweet_panel_light').setLabel('💎  Light Tweet').setStyle(ButtonStyle.Primary),
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `-# © ${new Date().getFullYear()} ${guild.name}. All rights reserved.`
        ));

    await ch.send({ flags: MessageFlags.IsComponentsV2, components: [panel], allowedMentions: { parse: [] } });
    return interaction.editReply({ content: `> ✅ Tweet panel sent to <#${cfg.panelChannelId}> successfully!` });
}

// ── Generate tweet card and post ──────────────────────────────────────────────

async function postTweet(interaction, client, mode) {
    await interaction.deferReply({ ephemeral: true });

    const guild   = interaction.guild;
    const user    = interaction.user;
    const member  = interaction.member;
    const content = interaction.fields.getTextInputValue('tweet_content').trim();

    const cfg = await TweetConfig.get(guild.id);
    if (!cfg.enabled) return interaction.editReply({ content: '> ❌ The tweet system is currently disabled.' });
    if (!cfg.tweetChannelId) return interaction.editReply({ content: '> ❌ Tweet channel not configured yet.' });

    const tweetCh = guild.channels.cache.get(cfg.tweetChannelId) ||
                    await guild.channels.fetch(cfg.tweetChannelId).catch(() => null);
    if (!tweetCh) return interaction.editReply({ content: '> ❌ Tweet channel not found. Please reconfigure.' });

    const panelCh = cfg.panelChannelId
        ? (guild.channels.cache.get(cfg.panelChannelId) || null)
        : null;

    const panelChName = panelCh  ? `#${panelCh.name}` : '#tweet-panel';
    const tweetChName = tweetCh  ? `#${tweetCh.name}` : '#tweets';

    try {
        const png = await buildTweetCard({
            mode,
            avatarUrl:    user.displayAvatarURL({ extension: 'png', size: 128 }),
            guildIconUrl: guild.iconURL({ extension: 'png', size: 64 }),
            displayName:  member?.displayName || user.globalName || user.username,
            username:     user.username,
            content,
            panelChName,
            tweetChName,
            showStats:    cfg.showStats,
            showVerified: cfg.showVerified,
        });

        const attachment = new AttachmentBuilder(png, { name: 'tweet.png' });
        await tweetCh.send({ files: [attachment], allowedMentions: { parse: [] } });

        return interaction.editReply({
            content: `> ✅ Your **${mode === 'dark' ? '🌑 Dark' : '💎 Light'} Tweet** has been posted to <#${cfg.tweetChannelId}>!`,
        });
    } catch (e) {
        return interaction.editReply({ content: `> ❌ Failed to generate tweet: \`${e.message}\`` });
    }
}

// ── Manage settings panel ─────────────────────────────────────────────────────

async function showManagePanel(interaction, cfg) {
    const guild = interaction.guild;
    if (!cfg) cfg = await TweetConfig.get(guild.id);
    const theme  = await themeManager.getTheme(guild.id);
    const accent = themeManager.getRGBColor(theme.color);

    const toggleLabel = (val, name) => `${val ? '✅' : '❌'}  ${name}: ${val ? 'ON' : 'OFF'}`;

    const container = new ContainerBuilder()
        .setAccentColor(accent)
        .addSectionComponents(s => s
            .addTextDisplayComponents(t => t.setContent(`## 🔧 __Manage Tweet Settings__`))
            .setThumbnailAccessory(th => th.setURL(
                guild.iconURL({ extension: 'png', size: 256 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png'
            ))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(t => t.setContent(
            `Toggle each feature on or off for this server's tweet system.`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder().setCustomId('tweet_manage_toggle_enabled')
                .setLabel(toggleLabel(cfg.enabled, 'System'))
                .setStyle(cfg.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('tweet_manage_toggle_stats')
                .setLabel(toggleLabel(cfg.showStats, 'Stats'))
                .setStyle(cfg.showStats ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tweet_manage_toggle_verified')
                .setLabel(toggleLabel(cfg.showVerified, 'Verified Badge'))
                .setStyle(cfg.showVerified ? ButtonStyle.Success : ButtonStyle.Secondary),
        ))
        .addActionRowComponents(r => r.addComponents(
            new ButtonBuilder().setCustomId('tweet_manage_back')
                .setLabel('← Back to Setup').setStyle(ButtonStyle.Secondary),
        ));

    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [container] });
}
