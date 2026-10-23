/**
 * &bg  —  Switch your active profile card background
 * Shows a select menu of all backgrounds the user has purchased.
 */

import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
} from 'discord.js';
import Profile from '../../../models/profile.js';

const cooldowns   = new Map();
const COOLDOWN_MS = 5_000;

export default {
    name:        'bg',
    aliases:     ['background', 'backgrounds', 'mybg'],
    description: 'Switch your active profile card background',
    category:    'General',
    usage:       '&bg',
    noPrefix:    true,

    async execute(message, args, client) {
        const userId  = message.author.id;
        const guildId = message.guild.id;
        const now     = Date.now();

        const exp = cooldowns.get(userId);
        if (exp && now < exp) {
            const left = Math.ceil((exp - now) / 1000);
            return message.reply({ content: `>  Please wait **${left}s** before using this again.` });
        }
        cooldowns.set(userId, now + COOLDOWN_MS);

        const profile = await Profile.getProfile(userId, guildId);

        if (!profile.backgrounds || profile.backgrounds.length === 0) {
            return message.reply(
                '>  You have no purchased backgrounds yet!\n' +
                '> Visit the shop channel and buy one to use it on your profile card.'
            );
        }

        // Build select options (max 25 per Discord limit)
        const options = profile.backgrounds.slice(0, 25).map((url, i) => {
            const isActive = url === profile.activeBg;
            const label    = `Background #${i + 1}${isActive ? '  Active' : ''}`;
            // Show a short portion of the URL as description
            const desc = url.length > 80 ? url.slice(0, 77) + '…' : url;
            return { label, description: desc, value: String(i) };
        });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`bg_select_${userId}`)
                .setPlaceholder('Choose a background to activate…')
                .addOptions(options)
        );

        const total   = profile.backgrounds.length;
        const current = profile.activeBg
            ? `Background #${profile.backgrounds.indexOf(profile.activeBg) + 1}`
            : 'Default';

        return message.reply({
            content:
                `> **Your Profile Card Backgrounds** — ${total} owned\n` +
                `> Currently active: **${current}**\n` +
                `> Select one below to make it active on your \`p\` card:`,
            components: [row],
        });
    },
};
