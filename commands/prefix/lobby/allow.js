import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
// ─── &allow — Allow Kicked User Back Into Lobby ───────────────────────────────
import { MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { getLobbyForMember, isLobbyOwner } from '../../../lib/lobbyManager.js';

export default {
    name: 'lobbyallow',
    aliases: ['allow', 'unkick', 'lallow'],
    description: 'Allow a previously kicked user back into your lobby',
    usage: '&allow @user',
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
                                `##   Owner Only\n> Only the lobby owner can allow users back in.`
                            )
                        )
                ],
            });
        }

        const target = await resolveMember(message, args[0]);
        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xFEE75C)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   No Target\n> Please mention a user or provide their ID.\n> Usage: \`&allow @user\``
                            )
                        )
                ],
            });
        }

        // Remove deny permission overwrite
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            await channel.permissionOverwrites.delete(target.id).catch(() => {});
        }

        // Remove from kickedUsers tracking
        if (data.kickedUsers instanceof Set) {
            data.kickedUsers.delete(target.id);
        }

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(0x57F287)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##   Access Restored\n` +
                                    `> **${target.displayName}** can now re-join your lobby.`
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
