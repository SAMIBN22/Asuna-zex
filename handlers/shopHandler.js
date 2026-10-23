/**
 * shopHandler.js
 * Handles: shop_buy_<configId>  and  bg_select_<userId>
 */

import { MessageFlags } from 'discord.js';
import Profile    from '../models/profile.js';
import ShopConfig from '../models/shopConfig.js';
import config     from '../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);


// ── Buy background ────────────────────────────────────────────────────────────
export async function handleShopBuy(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const configId = interaction.customId.replace('shop_buy_', '');
    const userId   = interaction.user.id;
    const guildId  = interaction.guild?.id;

    const shop = await ShopConfig.findById(configId).catch(() => null);
    if (!shop) {
        return interaction.editReply({ content: '> <a:15218346115192628311:1522708751495335996> This shop item no longer exists.' });
    }

    const profile = await Profile.getProfile(userId, guildId);

    // Already owns it?
    if (profile.backgrounds.includes(shop.bgUrl)) {
        return interaction.editReply({ content: `> <a:15218346115192628311:1522708751495335996> You already own **${shop.name}**.` });
    }

    // Check credits (unless infinite)
    const isOwner = OWNER_IDS.includes(userId) || profile.infiniteCredits;
    if (!isOwner && (profile.credits || 0) < shop.price) {
        const balance = profile.credits || 0;
        const need    = shop.price - balance;
        return interaction.editReply({
            content:
                `> <a:15218346115192628311:1522708751495335996> **Insufficient Credits**\n` +
                `> You need **${shop.price.toLocaleString()}** credits to purchase **${shop.name}**.\n` +
                `> Your balance: **${balance.toLocaleString()}** credits — short by **${need.toLocaleString()}**.\n` +
                `> Stay active in chat and voice channels to earn more credits!`,
        });
    }

    // Deduct credits & add background
    if (!isOwner) {
        profile.credits -= shop.price;
    }
    profile.backgrounds.push(shop.bgUrl);

    // Auto-activate if it's their first background
    if (!profile.activeBg) profile.activeBg = shop.bgUrl;

    profile.updatedAt = new Date();
    await profile.save();

    return interaction.editReply({
        content:
            `> <a:15161073033491252751:1522709165607354518> **${shop.name}** has been added to your profile card!\n` +
            `> Use \`p\` to see your new card, or \`bg\` to switch backgrounds.`,
    });
}

// ── Select active background ──────────────────────────────────────────────────
export async function handleBgSelect(interaction, client) {
    await interaction.deferUpdate();

    const userId  = interaction.customId.replace('bg_select_', '');
    const guildId = interaction.guild?.id;

    // Only the owner of the menu can use it
    if (interaction.user.id !== userId) {
        return interaction.followUp({ content: '> <a:15218346115192628311:1522708751495335996> This menu is not for you.', flags: MessageFlags.Ephemeral });
    }

    const selectedIdx = parseInt(interaction.values[0], 10);
    const profile     = await Profile.getProfile(userId, guildId);

    if (isNaN(selectedIdx) || !profile.backgrounds[selectedIdx]) {
        return interaction.followUp({ content: '> <a:15218346115192628311:1522708751495335996> Invalid selection.', flags: MessageFlags.Ephemeral });
    }

    profile.activeBg  = profile.backgrounds[selectedIdx];
    profile.updatedAt = new Date();
    await profile.save();

    await interaction.editReply({
        content:  `> <a:15161073033491252751:1522709165607354518> Background **#${selectedIdx + 1}** is now active on your profile card!\n> Use \`p\` to see it.`,
        components: [],
    });
}
