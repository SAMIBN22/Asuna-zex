import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
// ─── &kick — Kick User From Lobby ─────────────────────────────────────────────
import { MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { activeLobbies, getLobbyForMember, isLobbyOwner } from '../../../lib/lobbyManager.js';

export default {
    name: 'lobbykick',
    aliases: ['kick', 'lkick'],
    description: 'Kick a user from your lobby and prevent them from re-joining',
    usage: '&kick @user',
    category: 'Lobby',

    async execute(message, args, client) {
        const guild  = message.guild;
        const member = message.member;

        const found = getLobbyForMember(guild, member.id);
        if (!found) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Not In a Lobby\n> You must be in a lobby voice channel to use this command.`
                            )
                        )
                ],
            });
        }

        const { channelId, data } = found;

        if (!isLobbyOwner(channelId, member.id)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Owner Only\n> Only the lobby owner can kick members.`
                            )
                        )
                ],
            });
        }

        // Resolve target
        const target = await resolveMember(message, args[0]);
        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xFEE75C)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   No Target\n> Please mention a user or provide their ID.\n> Usage: \`&kick @user\``
                            )
                        )
                ],
            });
        }

        if (target.id === member.id) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xFEE75C)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`##   Cannot Kick Yourself`)
                        )
                ],
            });
        }

        const channel = guild.channels.cache.get(channelId);

        // Disconnect target from voice channel
        if (target.voice?.channelId === channelId) {
            await target.voice.disconnect('Kicked from lobby by owner').catch(() => {});
        }

        // Deny re-entry (deny Connect + ViewChannel on the lobby channel)
        if (channel) {
            await channel.permissionOverwrites.edit(target.id, {
                Connect:     false,
                ViewChannel: false,
            }).catch(() => {});
        }

        // Track kicked user
        data.kickedUsers = data.kickedUsers || new Set();
        data.kickedUsers.add(target.id);

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(0xED4245)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##   User Kicked\n` +
                                    `> **${target.displayName}** has been removed from the lobby and is now **locked out**.\n` +
                                    `> Use \`&allow @${target.user.username}\` to let them back in.`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ dynamic: true }))
                            )
                    )
            ],
        });
    },
};
