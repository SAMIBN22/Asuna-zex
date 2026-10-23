import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
} from 'discord.js';
import Profile from '../../../models/profile.js';
import config from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

function formatCredits(n) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')     + 'M';
    if (n >= 1_000)         return (n / 1_000).toFixed(2).replace(/\.?0+$/, '')         + 'K';
    return n.toLocaleString();
}

function isOwner(userId, profile) {
    if (OWNER_IDS.includes(String(userId))) return true;
    if (profile?.infiniteCredits) return true;
    return false;
}

export default {
    name: 'c',
    aliases: ['credits', 'credit', 'bal', 'balance'],
    description: 'Check or transfer credits',
    category: 'General',
    usage: '&c [@user | userID] [amount]',
    noPrefix: true,

    async execute(message, args, client) {
        const theme   = await client.themeManager.getTheme(message.guild.id).catch(() => null);
        const color   = theme ? client.themeManager.getRGBColor(theme.color) : 0x5865F2;
        const emojis  = theme?.emojis || {};
        const e       = {
            coin:   emojis.coin   || '',
            check:  emojis.check  || '',
            error:  emojis.error  || '',
            arrow:  emojis.arrow  || '',
            crown:  emojis.crown  || '',
            info:   emojis.info   || '',
        };

        const senderId = message.author.id;

        // ── No args: show own balance ─────────────────────────────────────────
        if (!args.length) {
            const profile = await Profile.getProfile(senderId, message.guild.id);
            const inf     = isOwner(senderId, profile);
            const balance = inf ? '∞' : formatCredits(profile.credits);
            const raw     = inf ? '∞' : profile.credits.toLocaleString();

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(color)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${e.coin} __Credits Balance__\n` +
                                `> **User:** ${message.author}\n` +
                                `> **Balance:** \`${balance}\` ${raw !== balance ? `*(${raw})*` : ''}\n` +
                                (inf
                                    ? `> ${e.crown} **You have unlimited credits.**`
                                    : `> ${e.info} Use \`&c @user <amount>\` to transfer credits.`)
                            )
                        ),
                ],
            });
        }

        // ── Resolve target user ───────────────────────────────────────────────
        let targetUser =
            message.mentions.users.first() ||
            (args[0] && /^\d{15,20}$/.test(args[0])
                ? await client.users.fetch(args[0]).catch(() => null)
                : null);

        // If first arg isn't a user, treat as balance check for self with no amount
        if (!targetUser) {
            const profile = await Profile.getProfile(senderId, message.guild.id);
            const balance = isOwner(senderId, profile) ? '∞' : formatCredits(profile.credits);
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(color)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${e.coin} __Credits Balance__\n` +
                                `> **User:** ${message.author}\n` +
                                `> **Balance:** \`${balance}\`\n` +
                                `> ${e.info} Usage: \`&c @user <amount>\` to transfer credits.`
                            )
                        ),
                ],
            });
        }

        // ── Resolve amount ────────────────────────────────────────────────────
        const rawAmount = args[1] ?? args[0];
        const amount = parseInt(rawAmount, 10);

        if (!rawAmount || isNaN(amount) || amount <= 0) {
            // No amount — show target's balance
            const profile = await Profile.getProfile(targetUser.id, message.guild.id);
            const balance = isOwner(targetUser.id, profile) ? '∞' : formatCredits(profile.credits);
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(color)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${e.coin} __Credits Balance__\n` +
                                `> **User:** ${targetUser}\n` +
                                `> **Balance:** \`${balance}\``
                            )
                        ),
                ],
            });
        }

        // ── Transfer ──────────────────────────────────────────────────────────
        if (targetUser.id === senderId) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(color)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${e.error} __Transfer Failed__\n> You cannot send credits to yourself.`
                            )
                        ),
                ],
            });
        }

        if (targetUser.bot) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(color)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${e.error} __Transfer Failed__\n> You cannot send credits to a bot.`
                            )
                        ),
                ],
            });
        }

        const [senderProfile, targetProfile] = await Promise.all([
            Profile.getProfile(senderId, message.guild.id),
            Profile.getProfile(targetUser.id, message.guild.id),
        ]);

        const senderIsInf = isOwner(senderId, senderProfile);

        if (!senderIsInf && senderProfile.credits < amount) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .setAccentColor(color)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${e.error} __Insufficient Credits__\n` +
                                `> **Your Balance:** \`${formatCredits(senderProfile.credits)}\`\n` +
                                `> **Required:** \`${formatCredits(amount)}\`\n` +
                                `> You need \`${formatCredits(amount - senderProfile.credits)}\` more credits.`
                            )
                        ),
                ],
            });
        }

        if (!senderIsInf) {
            senderProfile.credits -= amount;
            await senderProfile.save();
        }

        targetProfile.credits += amount;
        await targetProfile.save();

        const newSenderBal = senderIsInf ? '∞' : formatCredits(senderProfile.credits);
        const newTargetBal = isOwner(targetUser.id, targetProfile) ? '∞' : formatCredits(targetProfile.credits);

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder()
                    .setAccentColor(color)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${e.check} __Credits Transferred__\n` +
                            `> ${e.arrow} **From:** ${message.author} — Balance: \`${newSenderBal}\`\n` +
                            `> ${e.arrow} **To:** ${targetUser} — Balance: \`${newTargetBal}\`\n` +
                            `> ${e.coin} **Amount:** \`${formatCredits(amount)}\``
                        )
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `*Transaction completed successfully.*`
                        )
                    ),
            ],
        });
    },
};
