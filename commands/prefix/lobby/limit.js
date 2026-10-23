// ─── &limit — Set Lobby User Limit ────────────────────────────────────────────
import {
    MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} from 'discord.js';
import { getLobbyForMember, isLobbyOwner } from '../../../lib/lobbyManager.js';

export default {
    name: 'lobbylimit',
    aliases: ['limit', 'llimit'],
    description: 'Set the user limit of your lobby (or pick from quick buttons)',
    usage: '&limit [number]',
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
                                `##   Owner Only\n> Only the lobby owner can change the user limit.`
                            )
                        )
                ],
            });
        }

        const channel = guild.channels.cache.get(channelId);

        // If a number was provided directly
        if (args[0]) {
            const num = parseInt(args[0], 10);
            if (isNaN(num) || num < 0 || num > 99) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0xFEE75C)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##   Invalid Number\n> Limit must be between **0** (unlimited) and **99**.\n> Usage: \`&limit 4\``
                                )
                            )
                    ],
                });
            }

            await channel?.setUserLimit(num).catch(() => {});
            const display = num === 0 ? 'Unlimited' : `${num} players`;

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0x57F287)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Limit Updated\n> Lobby limit is now **${display}**.`
                            )
                        )
                ],
            });
        }

        // No number → show quick-pick panel
        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(0x5865F2)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##   Set Lobby Limit\n> **You can set a limit using the buttons below!**`
                        )
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`lobby_limit_2_${channelId}`).setLabel('2').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`lobby_limit_4_${channelId}`).setLabel('4').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`lobby_limit_6_${channelId}`).setLabel('6').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`lobby_limit_8_${channelId}`).setLabel('8').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`lobby_limit_0_${channelId}`).setLabel('∞ Unlimited').setStyle(ButtonStyle.Primary),
                        )
                    )
            ],
        });
    },
};
