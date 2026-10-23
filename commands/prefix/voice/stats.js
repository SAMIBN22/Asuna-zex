import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SectionBuilder,
    ThumbnailBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

export default {
    name: 'stats',
    description: 'Displays the server stats',
    aliases: ['vc', 'serverstats'],
    category: 'Voice',

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);


        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                                `> ${emojis.star || ''} **__You need the Administrator permission__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const guild = message.guild;
        await guild.members.fetch();
        const members = guild.members.cache;

        const totalMembers = guild.memberCount;
        const onlineMembers = members.filter(member =>
            member.presence && (['online', 'idle', 'dnd'].includes(member.presence.status))
        ).size;
        const membersInVoice = members.filter(m => m.voice.channelId).size;
        const boostCount = guild.premiumSubscriptionCount || 0;

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${emojis.voice || ''} __${guild.name} Stats__\n\n` +
                            `> ${emojis.star || ''} **__Total Members:__** \`${totalMembers}\`\n` +
                            `> ${emojis.star || ''} **__Online Members:__** \`${onlineMembers}\`\n` +
                            `> ${emojis.star || ''} **__Members In Voice:__** \`${membersInVoice}\`\n` +
                            `> ${emojis.star || ''} **__Server Boosts:__** \`${boostCount}\``
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${emojis.yes || ''} **__Enjoy your time with us!__**\n` +
                            `> ${emojis.dot || '•'} **__Server Status: Operational__**`
                        )
                    )
                    .setButtonAccessory((() => {
                        const btn = new ButtonBuilder()
                            .setCustomId('stats_display')
                            .setLabel(`Voice: ${membersInVoice}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true);
                        if (emojis.voice) btn.setEmoji(emojis.voice);
                        return btn;
                    })())
            );

        await message.delete().catch(() => null);
        return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
