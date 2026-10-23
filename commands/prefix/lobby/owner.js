// ─── &owner — Show Lobby Owner & Quick Controls ───────────────────────────────
import {
    MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} from 'discord.js';
import { getLobbyForMember, isLobbyOwner } from '../../../lib/lobbyManager.js';

const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

export default {
    name: 'lobbyowner',
    aliases: ['owner', 'lowner'],
    description: 'Check or display the current lobby owner',
    usage: '&owner',
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
        const ownerMember = guild.members.cache.get(data.ownerId);
        const ownerName   = ownerMember ? ownerMember.displayName : `Unknown (${data.ownerId})`;
        const thumb       = ownerMember?.user.displayAvatarURL({ dynamic: true }) || guild.iconURL({ dynamic: true });
        const isOwner     = isLobbyOwner(channelId, member.id);

        const channel = guild.channels.cache.get(channelId);
        const currentLimit = channel?.userLimit || 0;
        const limitDisplay = currentLimit === 0 ? 'Unlimited' : `${currentLimit} players`;

        const container = new ContainerBuilder().setAccentColor(0x5865F2)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `##   Lobby Info\n` +
                            `> **Channel:** <#${channelId}>\n` +
                            `> **Owner:** ${ownerMember ? `<@${data.ownerId}>` : `\`${ownerName}\``}\n` +
                            `> **Current Limit:** ${limitDisplay}`
                        )
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
            );

        if (isOwner) {
            container
                .addSeparatorComponents(divS())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**You are the owner — set a quick limit:**`)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`lobby_limit_2_${channelId}`).setLabel('2').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`lobby_limit_4_${channelId}`).setLabel('4').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`lobby_limit_6_${channelId}`).setLabel('6').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`lobby_limit_8_${channelId}`).setLabel('8').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`lobby_limit_0_${channelId}`).setLabel('∞').setStyle(ButtonStyle.Primary),
                    )
                );
        }

        return message.reply({
            flags:      MessageFlags.IsComponentsV2,
            components: [container],
        });
    },
};
