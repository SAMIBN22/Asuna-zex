import { AttachmentBuilder } from 'discord.js'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import path from 'path'
import fs from 'fs'

const userActivity = new Map();
const imageCache = new Map();

function ensureRankSettings(settings, gid) {
    if (!settings[gid]) settings[gid] = {};
    if (!settings[gid].rankSystem) {
        settings[gid].rankSystem = {
            enabled: false,
            timeAmount: 10,
            timeUnit: 'minute',
            rankRole: null,
            rankChannel: null,
            userRanks: {}
        };
    }
    return settings[gid].rankSystem;
}

function getTimeInSeconds(amount, unit) {
    const multipliers = { second: 1, minute: 60, hour: 3600, day: 86400 };
    return amount * (multipliers[unit] || 60);
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

function getUserRank(settings, gid, userId) {
    const rankSettings = ensureRankSettings(settings, gid);
    if (!rankSettings.userRanks[userId]) {
        rankSettings.userRanks[userId] = { level: 0, totalTime: 0, textTime: 0, voiceTime: 0 };
    }
    return rankSettings.userRanks[userId];
}

function addUserTime(settings, gid, userId, seconds, type = 'text') {
    const userRank = getUserRank(settings, gid, userId);
    userRank.totalTime += seconds;
    if (type === 'text') userRank.textTime += seconds;
    else if (type === 'voice') userRank.voiceTime += seconds;
    return userRank;
}

function checkLevelUp(settings, gid, userId) {
    const rankSettings = ensureRankSettings(settings, gid);
    const userRank = getUserRank(settings, gid, userId);
    const requiredTime = getTimeInSeconds(rankSettings.timeAmount, rankSettings.timeUnit);
    const expectedLevel = Math.floor(userRank.totalTime / requiredTime);
    if (expectedLevel > userRank.level) {
        const oldLevel = userRank.level;
        userRank.level = expectedLevel;
        return { leveledUp: true, oldLevel, newLevel: expectedLevel };
    }
    return { leveledUp: false };
}

async function sendLevelUpMessage(client, settings, gid, userId, oldLevel, newLevel) {
    try {
        const rankSettings = ensureRankSettings(settings, gid);
        if (!rankSettings.rankChannel) return;
        const guild = client.guilds.cache.get(gid);
        if (!guild) return;
        const channel = guild.channels.cache.get(rankSettings.rankChannel);
        if (!channel) return;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;

        const loadImageWithCache = async (url, timeout = 2000) => {
            if (imageCache.has(url)) return imageCache.get(url);
            const img = await Promise.race([
                loadImage(url),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
            ]);
            imageCache.set(url, img);
            if (imageCache.size > 50) imageCache.delete(imageCache.keys().next().value);
            return img;
        };

        const canvas = createCanvas(800, 300);
        const ctx = canvas.getContext('2d');
        const localBgPath = path.join(__dirname, '../../assets/levelup-bg.png');
        const avatarURL = member.user.displayAvatarURL({ size: 256, extension: 'png', dynamic: false });
        const backgroundURL = fs.existsSync(localBgPath) ? localBgPath : null;

        const [background, avatar] = await Promise.allSettled([
            backgroundURL ? loadImageWithCache(backgroundURL, 2000) : Promise.reject(),
            loadImageWithCache(avatarURL, 2000)
        ]);

        if (background.status === 'fulfilled') {
            ctx.drawImage(background.value, 0, 0, 800, 300);
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, 800, 300);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 800, 300);
            gradient.addColorStop(0, '#667eea'); gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, 800, 300);
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, 800, 300);
        }

        if (avatar.status === 'fulfilled') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(150, 150, 80, 0, Math.PI * 2); ctx.fill(); ctx.closePath();
            ctx.save();
            ctx.beginPath(); ctx.arc(150, 150, 75, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
            ctx.drawImage(avatar.value, 75, 75, 150, 150);
            ctx.restore();
        } else {
            ctx.fillStyle = '#7289DA';
            ctx.beginPath(); ctx.arc(150, 150, 75, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 48px Arial'; ctx.fillText('LEVEL UP!', 280, 80);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 32px Arial'; ctx.fillText(member.user.username, 280, 130);
        ctx.fillStyle = '#ffffff'; ctx.font = '24px Arial'; ctx.fillText(`Level ${oldLevel}`, 280, 180);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 32px Arial'; ctx.fillText('→', 400, 180);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 32px Arial'; ctx.fillText(`Level ${newLevel}`, 460, 180);
        ctx.fillStyle = '#ffffff'; ctx.font = '20px Arial'; ctx.fillText('Congratulations on reaching a new level!', 280, 230);

        const buffer = await canvas.encode('png');
        const attachment = new AttachmentBuilder(buffer, { name: 'levelup.png' });
        await channel.send({ content: `<@${userId}>`, files: [attachment] });
    } catch (e) {
        console.error('[rank-core] Error sending level up message:', e);
    }
}

function startVoiceTracking(userId, gid) {
    const key = `${gid}-${userId}`;
    if (!userActivity.has(key)) {
        userActivity.set(key, { voiceStart: Date.now(), textActivity: [] });
    } else {
        userActivity.get(key).voiceStart = Date.now();
    }
}

function stopVoiceTracking(settings, gid, userId) {
    const key = `${gid}-${userId}`;
    const activity = userActivity.get(key);
    if (activity && activity.voiceStart) {
        const duration = Math.floor((Date.now() - activity.voiceStart) / 1000);
        activity.voiceStart = null;
        if (duration > 0) { addUserTime(settings, gid, userId, duration, 'voice'); return duration; }
    }
    return 0;
}

function trackTextActivity(userId, gid) {
    const key = `${gid}-${userId}`;
    if (!userActivity.has(key)) {
        userActivity.set(key, { voiceStart: null, textActivity: [Date.now()] });
    } else {
        userActivity.get(key).textActivity.push(Date.now());
    }
}

function calculateTextTime(settings, gid, userId) {
    const key = `${gid}-${userId}`;
    const activity = userActivity.get(key);
    if (!activity || !activity.textActivity || activity.textActivity.length === 0) return 0;
    const timeToAdd = activity.textActivity.length;
    activity.textActivity = [];
    if (timeToAdd > 0) addUserTime(settings, gid, userId, timeToAdd, 'text');
    return timeToAdd;
}

export default {
    ensureRankSettings, getTimeInSeconds, formatTime, getUserRank,
    addUserTime, checkLevelUp, sendLevelUpMessage,
    startVoiceTracking, stopVoiceTracking, trackTextActivity, calculateTextTime,
    userActivity
};
