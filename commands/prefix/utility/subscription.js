import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'subscription',
    description: 'Check premium subscription status for this server',
    category: 'Utility',
    usage: 'subscription',
    aliases: ['sub', 'premium', 'vip'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const settings = await client.getSettings(message.guild.id);
        const isPremium = settings?.premium || false;
        const premiumSince = settings?.premiumSince ? `<t:${Math.floor(new Date(settings.premiumSince).getTime() / 1000)}:D>` : 'N/A';

        const status = isPremium ? ` **Active**` : ` **Inactive**`;
        const features = isPremium
            ? `> ${emojis.star || ''} Custom Voice Channels\n> ${emojis.star || ''} Premium Roles\n> ${emojis.star || ''} Priority Support\n> ${emojis.star || ''} Advanced Analytics`
            : `> ${emojis.star || ''} ~~Custom Voice Channels~~\n> ${emojis.star || ''} ~~Premium Roles~~\n> ${emojis.star || ''} ~~Priority Support~~\n> ${emojis.star || ''} ~~Advanced Analytics~~`;

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Subscription Status__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${message.guild.name}\n` +
                                `> ${emojis.star || ''} **Status:** ${status}\n` +
                                `> ${emojis.star || ''} **Plan:** ${isPremium ? 'Premium' : 'Free'}\n` +
                                `> ${emojis.star || ''} **Since:** ${isPremium ? premiumSince : 'N/A'}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.star || ''} __Premium Features__\n${features}` +
                        (!isPremium ? `\n\n>  Join our support server to upgrade to Premium!` : '')
                    ))
            ],
            allowedMentions: { parse: [] }
        });
    }
};
