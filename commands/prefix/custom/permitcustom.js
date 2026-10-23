import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'permitcustom',
    description: "Grant or revoke permission for a user to use custom bot management commands",
    category: 'BotManage',
    usage: '+permitcustom <add|remove|list> <user_id/mention>',
    aliases: ['pcustom', 'permit'],
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        if (!client.config.devIds.includes(message.author.id)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Permission Denied__\n` +
                                `> ${emojis.star || ''} Only the bot owners can manage custom permissions.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const action = args[0]?.toLowerCase();
        const targetId = args[1]?.replace(/[<@!>]/g, '');

        if (!action || !['add', 'remove', 'list'].includes(action)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __How To Use__\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}permitcustom\` <add|remove|list> [user]\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}permitcustom add ${message.author.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const config = await GuildConfig.findOne({ guildId });
        const permittedUsers = config?.customPermitUsers || [];

        if (action === 'list') {
            const list = permittedUsers.length > 0 ? permittedUsers.map(id => `> ${emojis.star || ''} <@${id}> (\`${id}\`)`).join('\n') : `> ${emojis.star || ''} No users are currently permitted.`;

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Permitted Users__\n` +
                                `${list}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!targetId) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Missing User__\n` +
                                `> ${emojis.star || ''} Please provide a user mention or ID.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === 'add') {
            if (permittedUsers.includes(targetId)) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.title || ''} __Already Permitted__\n` +
                                    `> ${emojis.star || ''} <@${targetId}> already has permission to use custom commands.`
                                )
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            await GuildConfig.findOneAndUpdate(
                { guildId },
                { $push: { customPermitUsers: targetId } },
                { upsert: true }
            );

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Permission Granted__\n` +
                                `> ${emojis.star || ''} <@${targetId}> can now use **BotManage** commands in this server.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ dynamic: true }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === 'remove') {
            if (!permittedUsers.includes(targetId)) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.title || ''} __Not Found__\n` +
                                    `> ${emojis.star || ''} <@${targetId}> is not in the permitted users list.`
                                )
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            await GuildConfig.findOneAndUpdate(
                { guildId },
                { $pull: { customPermitUsers: targetId } }
            );

            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Permission Revoked__\n` +
                                `> ${emojis.star || ''} <@${targetId}> has been removed from the permitted users list.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ dynamic: true }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
