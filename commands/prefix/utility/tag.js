import { resolveMember } from '../../../lib/resolveUser.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'tag',
    description: 'Tag a user with a custom message',
    category: 'Utility',
    usage: 'tag <@user|ID|username> [message]',
    aliases: ['mention', 'notify'],
    cooldown: 5,
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&tag <@user|ID|username> [message]\`**`
                    ))]
            });
        }

        let target;
        target = await resolveMember(message, args[0]);

        if (!target) {
            const query = args[0].replace(/[<@!>]/g, '');
            target = message.guild.members.cache.get(query) ||
                message.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === args[0].toLowerCase() ||
                    m.displayName.toLowerCase() === args[0].toLowerCase()
                );
        }

        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __User Not Found__\n> ${emojis.star || ''} **Could not find user:** \`${args[0]}\``
                    ))]
            });
        }

        const msgText = args.slice(1).join(' ') || 'You have been tagged!';

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Tag Notification__ — ${target.toString()}`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${target.displayName}\n` +
                                `> ${emojis.star || ''} **From:** ${message.author.toString()}\n` +
                                `> ${emojis.star || ''} **Message:** ${msgText.slice(0, 300)}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 })))
                    )
            ],
            allowedMentions: { users: [target.id] }
        });
    }
};
