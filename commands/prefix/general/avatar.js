import { resolveUser } from '../../../lib/resolveUser.js';
import {
    TextDisplayBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder
} from 'discord.js';

export default {
    name: 'avatar',
    description: "Display a user's avatar with interactive switching",
    category: 'General',
    aliases: ['a', 'pfp', 'av'],
    usage: '+avatar [@user | user_id]',

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        const targetId = args[0]?.replace(/[<@!>]/g, '');

        const user = await (async () => {
            if (message.mentions.users.size > 0) return message.mentions.users.first();
            if (targetId) {
                return await client.users.fetch(targetId).catch(() => null);
            }
            return message.author;
        })();

        if (!user) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __User Not Found__\n\n` +
                                `> ${emojis.star || ''} **__Could not find that user.__**\n` +
                                `> ${emojis.star || ''} **__Please try a valid mention or ID.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const serverMember = message.guild?.members.cache.get(user.id);
        const serverAvatar = serverMember?.displayAvatarURL({ extension: 'png', size: 4096, dynamic: true });
        const globalAvatar = user.displayAvatarURL({ extension: 'png', size: 4096, dynamic: true });

        const hasServerAvatar = serverAvatar && serverAvatar !== globalAvatar;
        let currentAvatar = hasServerAvatar ? serverAvatar : globalAvatar;
        let currentType = hasServerAvatar ? 'Server' : 'Global';

        const buildAvatarUI = (type, url) => {
            const globalBtn = new ButtonBuilder()
                .setCustomId('global_avatar')
                .setLabel('Global Avatar')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(type === 'Global');

            if (emojis.clouds) globalBtn.setEmoji(emojis.clouds);

            const serverBtn = new ButtonBuilder()
                .setCustomId('server_avatar')
                .setLabel('Server Avatar')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(type === 'Server' || !hasServerAvatar);

            const row = new ActionRowBuilder().addComponents(globalBtn, serverBtn);

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __${user.username}'s __\n\n` +
                                `> ${emojis.star || ''} **__Target:__** <@${user.id}>\n` +
                                `> ${emojis.star || ''} **__Showing:__** **${type} Avatar**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(item => item.setURL(url))
                )
                .addActionRowComponents(row);

            return {
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            };
        };

        const sent = await message.reply(buildAvatarUI(currentType, currentAvatar));

        const collector = sent.createMessageComponentCollector({
            time: 60000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'global_avatar') {
                currentAvatar = globalAvatar;
                currentType = 'Global';
            } else if (interaction.customId === 'server_avatar') {
                currentAvatar = serverAvatar;
                currentType = 'Server';
            }

            await interaction.update(buildAvatarUI(currentType, currentAvatar));
        });

        collector.on('end', () => { });
    }
};
