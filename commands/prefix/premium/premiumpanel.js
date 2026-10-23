import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    MessageFlags,
    PermissionsBitField
} from 'discord.js';
import GuildSetup from '../../../models/guildSetup.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'premiumpanel',
    description: 'Displays the premium room control panel',
    category: 'Premium',
    usage: '+premiumpanel',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const themeColor = client.themeManager.getRGBColor(theme.color);

        // 1. Check for system setup
        const config = await GuildConfig.findOne({ guildId });
        if (!config || !config.premiumCategory) {
            const setupError = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Configuration Missing__\n` +
                        `> ${theme.emojis.star || ''} __Premium system is not configured.__\n` +
                        `> ${theme.emojis.star || ''} __Please use \`${client.config.prefix}psetcategory\` to set the prime category first.__`
                    )
                );
            return message.reply({ components: [setupError], flags: MessageFlags.IsComponentsV2 });
        }

        // 2. Find THE user's owned premium room
        const userSetup = await GuildSetup.findOne({ guildId, ownerId: message.author.id, type: 'prime-room' });

        if (!userSetup) {
            const noRoomError = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Access Denied__\n` +
                        `> ${theme.emojis.star || ''} __You do not currently own a prime room.__\n` +
                        `> ${theme.emojis.star || ''} __Show this panel only to those who have a premium room.__`
                    )
                );
            return message.reply({ components: [noRoomError], flags: MessageFlags.IsComponentsV2 });
        }

        // 3. Prepare Control Buttons
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('panel_premium_name')
                .setLabel('Room Name')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_premium_limit')
                .setLabel('User Limit')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_premium_user_add')
                .setLabel('Add User')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_premium_user_remove')
                .setLabel('Reject User')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('panel_premium_manager_add')
                .setLabel('Add Manager')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_premium_manager_remove')
                .setLabel('Remove Manager')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_premium_info')
                .setLabel('Info')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('panel_premium_help')
                .setLabel('Help')
                .setStyle(ButtonStyle.Secondary)
        );

        // 4. Build Final Panel
        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${theme.emojis.title || ''} __Prime Control Panel__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `> ${theme.emojis.star || ''} __Room:__ <#${userSetup.channelId}>\n` +
                            `> ${theme.emojis.star || ''} __Owner:__ <@${userSetup.ownerId}>\n\n` +
                            `> ${theme.emojis.star || ''} ***__Manage your VIP settings using the buttons below.__***`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(theme.images?.thumbnail || message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(row1)
            .addActionRowComponents(row2);

        await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
