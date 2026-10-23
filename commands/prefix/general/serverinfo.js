import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    ChannelType,
} from 'discord.js';

// ── Custom emojis (in order provided) ─────────────────────────────────────────
const E_MEMBER_TOTAL = '';
const E_MEMBER_HUMAN = '';
const E_MEMBER_BOT   = '';
const E_CH_TEXT      = '';
const E_CH_VOICE     = '';
const E_CH_THREAD    = '';
const E_CH_TOTAL     = '';
const E_REGION       = '';
const E_EMOJI        = '';
const E_STICKER      = '';
const E_VERIFY       = '';
const E_VANITY       = '';
const E_BOOST        = '';
const E_BAN          = '';

const VERIFICATION = ['None', 'Low', 'Medium', 'High', 'Very High'];
const TIER_NAME    = ['No Boost', 'Tier 1', 'Tier 2', 'Tier 3'];

function div() {
    return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

export default {
    name: 'serverinfo',
    aliases: ['server', 'si', 'guildinfo', 'guild'],
    description: 'Display detailed server information',
    category: 'General',
    usage: '&serverinfo',

    async execute(message, args, client) {
        const guild  = message.guild;
        const theme  = await client.themeManager.getTheme(guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);

        // ── Fetch data ─────────────────────────────────────────────────────────
        await guild.members.fetch().catch(() => {});
        const owner    = await guild.fetchOwner().catch(() => null);
        const bans     = await guild.bans.fetch().catch(() => null);
        const threads  = await guild.channels.fetchActiveThreads().catch(() => null);

        const channels   = guild.channels.cache;
        const members    = guild.members.cache;
        const emojis     = guild.emojis.cache;
        const stickers   = guild.stickers.cache;
        const roles      = guild.roles.cache;

        // ── Member counts ──────────────────────────────────────────────────────
        const totalMembers = guild.memberCount;
        const botCount     = members.filter(m => m.user.bot).size;
        const humanCount   = totalMembers - botCount;

        // ── Channel counts ─────────────────────────────────────────────────────
        const textCount   = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceCount  = channels.filter(c =>
            c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice
        ).size;
        const threadCount = threads?.threads?.size ?? 0;
        const totalChCount = textCount + voiceCount + threadCount;

        // ── Other stats ────────────────────────────────────────────────────────
        const regionLocale  = guild.preferredLocale ?? 'en-US';
        const roleCount     = roles.size - 1;   // exclude @everyone
        const emojiCount    = emojis.size;
        const stickerCount  = stickers.size;
        const verifyLevel   = VERIFICATION[guild.verificationLevel] ?? 'Unknown';
        const boostCount    = guild.premiumSubscriptionCount || 0;
        const boostTier     = TIER_NAME[guild.premiumTier] ?? 'None';
        const vanityUrl     = guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : 'None';
        const banCount      = bans?.size ?? 'N/A';
        const createdTs     = Math.floor(guild.createdTimestamp / 1000);
        const premiumStatus = boostTier === 'No Boost' ? ' Free' : `${E_BOOST} ${boostTier}`;

        // ── Owner display ──────────────────────────────────────────────────────
        const ownerTag = owner ? `@${owner.user.username} ` : 'Unknown';

        // ── Build content ──────────────────────────────────────────────────────
        const headerLine =
            `**Server ID:** \`${guild.id}\`  •  **Owner:** ${ownerTag}  •  **Premium Status:** ${premiumStatus}`;

        const membersBlock =
            `**Server Members**\n` +
            `${E_MEMBER_TOTAL} Total members: \`${totalMembers}\`\n` +
            `${E_MEMBER_HUMAN} Human members: \`${humanCount}\`\n` +
            `${E_MEMBER_BOT} Total bots: \`${botCount}\``;

        const channelsBlock =
            `**Channels**\n` +
            `${E_CH_TEXT} Text channels: \`${textCount}\`\n` +
            `${E_CH_VOICE} Voice channels: \`${voiceCount}\`\n` +
            `${E_CH_THREAD} Threads: \`${threadCount}\`\n` +
            `${E_CH_TOTAL} Total: \`${totalChCount}\``;

        const statsRow1 =
            `**Server Region**  •  **Roles**  •  **Emojis**\n` +
            `${E_REGION} \`${regionLocale}\`  •   \`${roleCount}\`  •  ${E_EMOJI} \`${emojiCount}\``;

        const statsRow2 =
            `**Stickers**  •  **Verification**  •  **Boost Count**\n` +
            `${E_STICKER} \`${stickerCount}\`  •  ${E_VERIFY} \`${verifyLevel}\`  •  ${E_BOOST} \`${boostCount} (${boostTier})\``;

        const vanityBlock =
            `**Vanity URL**\n${E_VANITY} \`${vanityUrl}\``;

        const createdBlock =
            `**Server Created**\n <t:${createdTs}:R>`;

        const banBlock =
            `**Ban Count**\n${E_BAN} \`${banCount}\``;

        const footer =
            `-# ${client.user.displayAvatarURL() ? '' : ''}Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`;

        // ── Assemble container ─────────────────────────────────────────────────
        const container = new ContainerBuilder().setAccentColor(accent);

        // Title + server icon
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## __${guild.name}__\n${headerLine}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(
                        guild.iconURL({ extension: 'png', size: 256 }) ||
                        client.user.displayAvatarURL()
                    )
                )
        );

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(membersBlock));

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(channelsBlock));

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsRow1));

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsRow2));

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(vanityBlock));

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(createdBlock));

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(banBlock));

        container.addSeparatorComponents(div());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footer));

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { repliedUser: false },
        });
    },
};
