import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags
} from 'discord.js';
import Warn from '../../../models/warn.js';
import emojis from '../../emojis.js';

export default {
    name: 'warnings',
    aliases: ['warninglist', 'warnlist', 'checkwarns'],
    description: 'View all warnings for a member',
    category: 'BotManage',
    usage: '&warnings <ID|@member|username>',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&warnings <ID|@member|username>\`**`
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

        const userWarns = await Warn.find({ guildId: message.guild.id, userId: target.id }).sort({ date: -1 });

        if (!userWarns.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __No Warnings__\n` +
                                `> ${emojis.star || ''} **${target.displayName}** has no warnings on record.`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 })))
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        const warnLines = userWarns.slice(0, 10).map((w, i) => {
            const date = `<t:${Math.floor(new Date(w.date).getTime() / 1000)}:d>`;
            const mod = w.moderatorId ? `<@${w.moderatorId}>` : 'Unknown';
            return `> ${emojis.star || ''} **#${i + 1}** · \`${w.type}\` — ${w.reason.slice(0, 60)} · ${date} by ${mod}`;
        }).join('\n');

        const overflow = userWarns.length > 10 ? `\n> *...and ${userWarns.length - 10} more warnings*` : '';
        const activeCount = userWarns.filter(w => w.active).length;

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Warning Records__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${target.displayName}\n` +
                            `> ${emojis.star || ''} **Total Warnings:** \`${userWarns.length}\`\n` +
                            `> ${emojis.star || ''} **Active:** \`${activeCount}\`\n` +
                            `> ${emojis.star || ''} **User:** ${target.toString()}`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 })))
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.star || ''} __Warning List__\n${warnLines}${overflow}`
                    ))
            ],
            allowedMentions: { parse: [] }
        });
    }
};
