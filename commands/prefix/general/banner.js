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
    name: 'banner',
    description: "Display a user's banner with interactive switching",
    category: 'General',
    aliases: ['b', 'userbanner'],
    usage: '+banner [@user | user_id]',

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
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                );

            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 || 0 });
        }

        const fetchedUser = await client.users.fetch(user.id, { force: true });
        const globalBanner = fetchedUser.bannerURL({ extension: 'png', size: 4096, dynamic: true });

        const serverMember = message.guild?.members.cache.get(user.id);
        const serverBanner = serverMember?.bannerURL({ extension: 'png', size: 4096, dynamic: true });

        const hasGlobalBanner = !!globalBanner;
        const hasServerBanner = !!serverBanner;

        if (!hasGlobalBanner && !hasServerBanner) {
            const noBannerContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __No Banner Found__\n\n` +
                                `> ${emojis.star || ''} **__The user <@${user.id}> does__**\n` +
                                `> ${emojis.star || ''} **__not currently have a banner.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                );

            return message.reply({ components: [noBannerContainer], flags: MessageFlags.IsComponentsV2 || 0 });
        }

        let currentBanner = hasGlobalBanner ? globalBanner : serverBanner;
        let currentType = hasGlobalBanner ? 'Global' : 'Server';

        const buildBannerUI = (type, url) => {
            const globalBtn = new ButtonBuilder()
                .setCustomId('global_banner')
                .setLabel('Global Banner')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(type === 'Global' || !hasGlobalBanner);

            if (emojis.clouds) globalBtn.setEmoji(emojis.clouds);

            const serverBtn = new ButtonBuilder()
                .setCustomId('server_banner')
                .setLabel('Server Banner')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(type === 'Server' || !hasServerBanner);

            if (emojis.star) serverBtn.setEmoji(emojis.star);

            const row = new ActionRowBuilder().addComponents(globalBtn, serverBtn);

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __${user.username}'s ${type} Banner__\n\n` +
                                `> ${emojis.star || ''} **__Target:__** <@${user.id}>\n` +
                                `> ${emojis.star || ''} **__Showing:__** **${type} Banner**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(user.displayAvatarURL({ extension: 'png', size: 512 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(item => item.setURL(url))
                )
                .addActionRowComponents(row);

            return {
                flags: MessageFlags.IsComponentsV2 || 0,
                components: [container]
            };
        };

        const sent = await message.reply(buildBannerUI(currentType, currentBanner));

        const collector = sent.createMessageComponentCollector({
            time: 60000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'global_banner') {
                currentBanner = globalBanner;
                currentType = 'Global';
            } else if (interaction.customId === 'server_banner') {
                currentBanner = serverBanner;
                currentType = 'Server';
            }

            await interaction.update(buildBannerUI(currentType, currentBanner));
        });

        collector.on('end', () => {
            // Silently complete
        });
    }
};
