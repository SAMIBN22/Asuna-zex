import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import config from '../../../config/config.js';

export default {
    name: 'invitebot',
    description: 'Get the invite link and support server for the bot',
    category: 'Utility',
    usage: 'invitebot',
    aliases: ['invite', 'addbot'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        const supportUrl = config.supportServer;

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Invite ${client.user.username}__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${emojis.star || ''} **${client.user.username}**\n` +
                                `> ${emojis.star || ''} **Servers:** \`${client.guilds.cache.size}\`\n` +
                                `> ${emojis.star || ''} **Commands:** \`${client.prefixCommands?.size || 0}\`\n` +
                                `> ${emojis.star || ''} **Invite the bot to your server using the links below!**`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 })))
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `> ${emojis.star || ''} **Invite Link:** [Click here to add the bot](${inviteUrl})\n` +
                        `> ${emojis.star || ''} **Support Server:** [Join our community](${supportUrl})`
                    ))
            ],
            allowedMentions: { parse: [] }
        });
    }
};
