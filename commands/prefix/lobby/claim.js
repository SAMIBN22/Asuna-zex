// ─── &claim — Claim Solo Lobby Ownership ──────────────────────────────────────
import { MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { activeLobbies, getLobbyForMember, buildLobbyLog } from '../../../lib/lobbyManager.js';

export default {
    name: 'claim',
    aliases: ['claimlobby'],
    description: 'Claim ownership of a lobby whose owner has left',
    usage: '&claim',
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

        // Check: owner is still in the channel
        const channel = guild.channels.cache.get(channelId);
        if (channel?.members?.has(data.ownerId)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xFEE75C)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Owner Is Still Here\n` +
                                `> The current owner <@${data.ownerId}> is still in the lobby.\n` +
                                `> You can only claim ownership after they leave.`
                            )
                        )
                ],
            });
        }

        // Check: already the owner
        if (data.ownerId === member.id) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0x5865F2)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   You Already Own This Lobby`
                            )
                        )
                ],
            });
        }

        // Transfer ownership
        const previousOwner = data.ownerId;
        data.ownerId = member.id;

        // Update channel permissions
        if (channel) {
            await channel.permissionOverwrites.edit(member.id, {
                ManageChannels: true,
                MuteMembers:    true,
                DeafenMembers:  true,
                MoveMembers:    true,
            }).catch(() => {});
            // Remove manage perms from old owner if they're not a server admin
            await channel.permissionOverwrites.delete(previousOwner).catch(() => {});
        }

        // Send claimed log to logs channel
        if (data.logsChannelId) {
            const logsChannel = guild.channels.cache.get(data.logsChannelId);
            if (logsChannel?.isTextBased()) {
                const log = buildLobbyLog('claimed', member, channelId, `<@${member.id}>`, 0x5865F2);
                await logsChannel.send(log).catch(() => {});
            }
        }

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(0x57F287)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##   Lobby Claimed!\n` +
                                    `> You are now the owner of <#${channelId}>.\n` +
                                    `> No one else can claim it while you are in the lobby.`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true }))
                            )
                    )
            ],
        });
    },
};
