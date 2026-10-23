import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'inviteinfo',
    description: 'View information about a Discord invite',
    category: 'Utility',
    usage: 'inviteinfo <invite code>',
    aliases: ['iinfo'],
    cooldown: 120,
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&inviteinfo <code or link>\`**`
                    ))]
            });
        }

        const code = args[0].replace(/https?:\/\/discord\.gg\//, '').replace(/https?:\/\/discord\.com\/invite\//, '').trim();
        const loading = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().setAccentColor(accentColor)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.title || ''} __Fetching Invite Info...__`))]
        });

        try {
            const invite = await client.fetchInvite(code);
            const guild = invite.guild;
            const expires = invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never';
            const icon = guild?.iconURL({ extension: 'png', size: 256 });
            const verLevel = ['None', 'Low', 'Medium', 'High', 'Highest'][guild?.verificationLevel] || 'Unknown';

            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Invite Information__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${guild?.name || 'Unknown Server'}\n` +
                                    `> ${emojis.star || ''} **Code:** \`${code}\`\n` +
                                    `> ${emojis.star || ''} **Inviter:** ${invite.inviter ? `${invite.inviter.tag}` : 'Unknown'}\n` +
                                    `> ${emojis.star || ''} **Channel:** ${invite.channel?.name || 'Unknown'}\n` +
                                    `> ${emojis.star || ''} **Members:** ${invite.memberCount?.toLocaleString() || 'N/A'}\n` +
                                    `> ${emojis.star || ''} **Online:** ${invite.presenceCount?.toLocaleString() || 'N/A'}\n` +
                                    `> ${emojis.star || ''} **Verification:** ${verLevel}\n` +
                                    `> ${emojis.star || ''} **Expires:** ${expires}`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(icon || client.user.displayAvatarURL()))
                        )
                ]
            });
        } catch {
            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Invalid Invite__\n> ${emojis.star || ''} **Could not find invite:** \`${code}\``
                    ))]
            });
        }
    }
};
