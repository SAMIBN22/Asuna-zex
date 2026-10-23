import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
// &inf @user   — Owner only: grant or revoke infinite credits
import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} from 'discord.js';
import Profile from '../../../models/profile.js';
import config  from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

export default {
    name:        'inf',
    aliases:     ['infinf', 'setinf', 'grantinf'],
    description: 'Grant or revoke infinite credits for a user (Owner only)',
    category:    'Owner',
    usage:       '&inf @user',
    ownerOnly:   true,
    noPrefix:    true,

    async execute(message, args, client) {
        // ── Owner check ───────────────────────────────────────────────────────
        if (!OWNER_IDS.includes(message.author.id)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            ' **Access Denied** — This command is for bot owners only.'
                        )
                    ),
                ],
            });
        }

        // ── Resolve target ────────────────────────────────────────────────────
        const targetUser = await resolveMember(message, args[0]);
        if (!targetUser) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            ' **Usage:** `&inf @user` or `&inf <userID>`'
                        )
                    ),
                ],
            });
        }

        if (targetUser.bot) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(' Cannot grant infinite credits to a bot.')
                    ),
                ],
            });
        }

        // ── Toggle infinite credits ───────────────────────────────────────────
        const profile = await Profile.getProfile(targetUser.id, message.guild.id);
        profile.infiniteCredits = !profile.infiniteCredits;
        await profile.save();

        const state  = profile.infiniteCredits ? 'granted ∞' : 'revoked';
        const emoji  = profile.infiniteCredits ? ''         : '';
        const status = profile.infiniteCredits
            ? `**${targetUser.tag}** now has **infinite credits (∞)**.`
            : `**${targetUser.tag}** no longer has infinite credits.\n> Current balance: \`${profile.credits.toLocaleString()}\` credits.`;

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${emoji} Infinite Credits ${state === 'granted ∞' ? 'Granted' : 'Revoked'}\n` +
                        `> ${status}\n` +
                        `> **Action by:** ${message.author}`
                    )
                ),
            ],
        });
    },
};
