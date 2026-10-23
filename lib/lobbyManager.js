// ─── Solo Lobby — Shared State & Helpers ──────────────────────────────────────
import {
    MessageFlags,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// voiceChannelId → { guildId, ownerId, kickedUsers: Set<userId>, logsChannelId, welcomeMsgId }
export const activeLobbies = new Map();

// ─── Lookup helpers ────────────────────────────────────────────────────────────
export function getLobbyForMember(guild, userId) {
    for (const [chId, lobby] of activeLobbies) {
        if (lobby.guildId !== guild.id) continue;
        const ch = guild.channels.cache.get(chId);
        if (ch?.members?.has(userId)) return { channelId: chId, data: lobby };
    }
    return null;
}

export function isLobbyOwner(channelId, userId) {
    return activeLobbies.get(channelId)?.ownerId === userId;
}

// ─── Detect the game a member was playing (Discord presence activity) ─────────
export function getMemberGameName(member) {
    const activities = member?.presence?.activities;
    if (!activities?.length) return null;

    const game = activities.find((a) => a.type === 0) || activities.find((a) => a.name); // 0 = ActivityType.Playing
    return game?.name || null;
}

// ─── Welcome panel (sent in the lobby's own voice-channel chat) ───────────────
export function buildWelcomePanel(member, channelId, prefix, gameName = null) {
    const thumb = member.user.displayAvatarURL({ dynamic: true, size: 512 });

    const headerLine =
        `## Hey <@${member.id}>` + (gameName ? `  •   **${gameName}**` : '') + `\n` +
        `### Welcome to your Solo lobby!` +
        (gameName ? `\n-#  Currently playing **${gameName}**` : '');

    const container = new ContainerBuilder()
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(headerLine)
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        )
        .addSeparatorComponents(divS())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**You can set a limit using the buttons below!**`)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lobby_limit_2_${channelId}`).setLabel('2').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lobby_limit_4_${channelId}`).setLabel('4').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lobby_limit_6_${channelId}`).setLabel('6').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lobby_limit_8_${channelId}`).setLabel('8').setStyle(ButtonStyle.Secondary),
            )
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**There are some useful commands to control your lobby:**\n\n` +
                `\`${prefix}claim\` — Claim the ownership of the lobby!\n` +
                `\`${prefix}kick\` — Kick a user from your lobby!\n` +
                `\`${prefix}allow\` — Allow a kicked user back in!\n` +
                `\`${prefix}limit\` — Change the player limit of your lobby!\n` +
                `\`${prefix}owner\` — Check or transfer lobby ownership!`
            )
        );

    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

// ─── Small log embed sent in the logs channel ──────────────────────────────────
export function buildLobbyLog(type, member, channelId, ownerMention, accentColor) {
    const now   = Math.floor(Date.now() / 1000);
    const thumb = member.user.displayAvatarURL({ dynamic: true });

    const lines = {
        join: {
            title: `##   Member Joined Lobby`,
            body:  `> **Member:** <@${member.id}> (\`${member.user.tag}\`)\n> **Lobby:** <#${channelId}>\n> **Owner:** ${ownerMention}\n> **Time:** <t:${now}:R>`,
            color: 0x57F287,
        },
        leave: {
            title: `##   Member Left Lobby`,
            body:  `> **Member:** <@${member.id}> (\`${member.user.tag}\`)\n> **Lobby:** <#${channelId}>\n> **Owner:** ${ownerMention}\n> **Time:** <t:${now}:R>`,
            color: 0xED4245,
        },
        ownerLeft: {
            title: `##   Lobby Owner Left — Claimable!`,
            body:  `> **Previous Owner:** <@${member.id}>\n> **Lobby:** <#${channelId}>\n> **Time:** <t:${now}:R>\n> ‎\n> Anyone remaining in the lobby can now run \`+claim\` to take ownership.`,
            color: 0xFEE75C,
        },
        claimed: {
            title: `##   Lobby Ownership Claimed`,
            body:  `> **New Owner:** <@${member.id}> (\`${member.user.tag}\`)\n> **Lobby:** <#${channelId}>\n> **Time:** <t:${now}:R>`,
            color: 0x5865F2,
        },
    };

    const entry = lines[type] || lines.join;
    const container = new ContainerBuilder().setAccentColor(entry.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${entry.title}\n${entry.body}`)
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb))
        );

    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}
