import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    ChannelType,
} from 'discord.js';

// ─── Helper: ephemeral ComponentsV2 reply ────────────────────────────────────
function ephemeralReply(client, theme, title, lines) {
    const avatar = client.user?.displayAvatarURL({ extension: 'png', size: 256 })
        || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const container = new ContainerBuilder()
        .setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${theme.emojis?.title || ''} __${title}__`
                    )
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n'))
        );

    return {
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        components: [container],
    };
}

// ─── Permission check ─────────────────────────────────────────────────────────
function hasPermission(interaction) {
    // Server owner always allowed
    if (interaction.guild.ownerId === interaction.user.id) return true;

    const botTop    = interaction.guild.members.me?.roles.highest.position  ?? 0;
    const memberTop = interaction.member.roles.highest.position;

    // Member's highest role must be strictly above the bot's highest role
    return memberTop > botTop;
}

// ─── Command definition ───────────────────────────────────────────────────────
export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a message as the bot to any channel — looks like a regular user message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message content to send')
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Target channel — defaults to the current channel if not specified')
                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildAnnouncement,
                    ChannelType.PublicThread,
                    ChannelType.PrivateThread,
                )
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const theme = await client.themeManager.getTheme(interaction.guild.id);
        const star  = theme.emojis?.star || '';

        // ── Permission gate ───────────────────────────────────────────────────
        if (!hasPermission(interaction)) {
            return interaction.reply(ephemeralReply(
                client, theme,
                'Access Denied',
                [
                    `> ${star} **You don't have permission to use this command.**`,
                    `> ${star} Only the **server owner** or members with a **role higher than the bot** can use \`/say\`.`,
                ]
            ));
        }

        const content = interaction.options.getString('message', true);
        const target  = interaction.options.getChannel('channel') ?? interaction.channel;

        // ── Verify the bot can send messages in the target channel ────────────
        const botMember = interaction.guild.members.me;
        const perms     = target.permissionsFor(botMember);

        if (!perms?.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply(ephemeralReply(
                client, theme,
                'Missing Permissions',
                [
                    `> ${star} I don't have **Send Messages** permission in ${target}.`,
                    `> ${star} Please grant me access to that channel and try again.`,
                ]
            ));
        }

        // ── Send the message as plain text (no embed, no bot indicator) ───────
        try {
            await target.send({ content, allowedMentions: { parse: [] } });
        } catch {
            return interaction.reply(ephemeralReply(
                client, theme,
                'Send Failed',
                [
                    `> ${star} Failed to send the message to ${target}.`,
                    `> ${star} Check that I have the correct channel permissions.`,
                ]
            ));
        }

        // ── Confirm to the executor (ephemeral — only they see it) ────────────
        return interaction.reply(ephemeralReply(
            client, theme,
            'Message Sent',
            [
                `> ${star} **Channel:** ${target}`,
                `> ${star} **Content:**\n> \`\`\`\n> ${content.slice(0, 200)}${content.length > 200 ? '…' : ''}\n> \`\`\``,
            ]
        ));
    },
};
