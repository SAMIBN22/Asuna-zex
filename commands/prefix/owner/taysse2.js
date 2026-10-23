/**
 * &taysse2 — Smart Automation Panel (Bot Owners Only)
 *
 * Provides an interactive control panel for configuring:
 *  • Auto React  — bot reacts with a set emoji on every message a user sends
 *  • Auto Reply  — bot auto-replies with a set text on every message a user sends
 *
 * Usage: &taysse2
 */

import { MessageFlags } from 'discord.js';
import config       from '../../../config/config.js';
import themeManager from '../../../themes/themeManager.js';
import { buildMainPanel } from '../../../handlers/taysse2Handler.js';

const OWNER_IDS = (config.devIds || []).map(String);
function isOwner(id) { return OWNER_IDS.includes(String(id)); }

export default {
    name:        'taysse2',
    aliases:     ['smartpanel', 'autopanel'],
    description: 'Owner: Smart Automation — Auto React & Auto Reply management panel',
    category:    'Owner',
    usage:       '&taysse2',

    async execute(message, args, client) {
        if (!isOwner(message.author.id)) return; // Silent — not an owner

        const theme  = await themeManager.getTheme(message.guild.id);
        const accent = themeManager.getRGBColor(theme.color);

        const components = await buildMainPanel(message.guild, accent, client, false);

        await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components,
            allowedMentions: { parse: [] },
        });
    },
};
