import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags
} from 'discord.js';

export default {
    name: 'randommembervoice',
    aliases: ['randomvoice', 'rvoice', 'pickvoice', 'randomvc'],
    description: 'Pick a random member from a voice channel',
    category: 'Voice',
    usage: '&randommembervoice [#channel]',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        // Determine the target voice channel
        let vc = message.member.voice.channel;
        if (args[0]) {
            const channelId = args[0].replace(/[<#>]/g, '');
            const found = message.guild.channels.cache.get(channelId);
            if (found?.isVoiceBased()) vc = found;
        }

        if (!vc) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __No Voice Channel__\n` +
                                `> ${emojis.star || ''} Join a voice channel first, or mention a channel:\n` +
                                `> ${emojis.star || ''} **\`&randommembervoice #channel\`**`
                            )
                        )
                ]
            });
        }

        const members = vc.members.filter(m => !m.user.bot);
        if (members.size === 0) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Empty Channel__\n` +
                                `> ${emojis.star || ''} No human members found in **${vc.name}**.`
                            )
                        )
                ]
            });
        }

        const membersArray = Array.from(members.values());
        const winner = membersArray[Math.floor(Math.random() * membersArray.length)];
        const allNames = membersArray.map(m => `> ${emojis.star || ''} ${m.displayName}`).join('\n');

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Random Member Picker__`)
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##  ${winner.displayName}\n` +
                                    `> ${emojis.star || ''} **Selected from:** ${vc.name}\n` +
                                    `> ${emojis.star || ''} **Pool size:** ${members.size} member${members.size !== 1 ? 's' : ''}\n` +
                                    `> ${emojis.star || ''} **User:** ${winner.toString()}`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(winner.user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} __All Members in Pool__\n${allNames}`
                        )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
