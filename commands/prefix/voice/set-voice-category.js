import { PermissionFlagsBits, ChannelType } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
import config from '../../../config/config.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_FILE = path.join(__dirname, '../../db/privateVoiceSettings.json');
const PERMS_FILE = path.join(__dirname, '../../db/voicePermissions.json');

const BOT_OWNER_IDS = (config.devIds || []).map(String);

function hasVoicePermission(guildId, userId, ownerId) {
    if (BOT_OWNER_IDS.includes(String(userId))) return true; // bot owner bypass
    if (userId === ownerId) return true;
    try {
        if (fs.existsSync(PERMS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PERMS_FILE, 'utf8'));
            return (data[guildId] || []).includes(userId);
        }
    } catch (e) {}
    return false;
}

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading voice settings:', error);
    }
    return {};
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error saving voice settings:', error);
    }
}

export default {
    name: 'set-voice-category',
    aliases: ['voicecategory', 'voice-category', 'setvc'],
    description: 'Set the category for private voice rooms',
    usage: '-set-voice-category <category-id>',
    category: 'Private Voice',
    permissions: null,

    async execute(message, args) {
        if (!hasVoicePermission(message.guild.id, message.author.id, message.guild.ownerId)) {
            return message.reply(' You do not have permission to use this command!');
        }

        const categoryId = args[0];
        
        if (!categoryId) {
            return message.reply('**Usage:** `+set-voice-category <category-id>`\n\nRight-click on a category and copy its ID.');
        }

        try {
            const category = await message.guild.channels.fetch(categoryId);
            
            if (!category || category.type !== ChannelType.GuildCategory) {
                return message.reply('Please provide a valid category ID!');
            }

            const settings = loadSettings();
            settings[message.guild.id] = {
                categoryId: category.id
            };
            saveSettings(settings);

            await message.reply(`Voice room category set to: **${category.name}**`);
        } catch (error) {
            console.error('Error setting voice category:', error);
            await message.reply('Invalid category ID. Please make sure the ID is correct.');
        }
    }
};
