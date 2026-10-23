import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import Warn from '../../../models/warn.js';
import emojis from '../../emojis.js';

export default {
    name: 'clearwarnings',
    aliases: ['clearwarns', 'warnsclear', 'resetwarnings'],
    description: 'Clear all warnings for a member',
    category: 'BotManage',
    usage: '&clearwarnings <ID|@member|username>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Permission Denied__\n> ${emojis.star || ''} You need **Administrator** permission.`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                    )],
                allowedMentions: { parse: [] }
            });
        }

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&clearwarnings <ID|@member|username>\`**`
                    ))]
            });
        }

        const query = args[0].replace(/[<@!>]/g, '');
        const target = message.guild.members.cache.get(query) ||
            message.guild.members.cache.find(m =>
                m.user.username.toLowerCase() === args[0].toLowerCase() ||
                m.displayName.toLowerCase() === args[0].toLowerCase()
            ) || await message.guild.members.fetch(query).catch(() => null);

        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __User Not Found__\n> ${emojis.star || ''} Could not find: \`${args[0]}\``
                    ))]
            });
        }

        const result = await Warn.deleteMany({ guildId: message.guild.id, userId: target.id });
        const count = result.deletedCount;

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || emojis.broom} __Warnings Cleared__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${target.displayName}\n` +
                            `> ${emojis.star || ''} **Warnings Cleared:** \`${count}\`\n` +
                            `> ${emojis.star || ''} **Cleared by:** ${message.author.toString()}\n` +
                            `> ${emojis.star || ''} **Status:** All warnings removed successfully.`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 })))
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
