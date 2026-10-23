import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import emojis from '../../emojis.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: 'alert',
    description: 'Send a professional alert message to a user DM',
    usage: '+alert <user_id/mention> <message>',
    category: 'Admin',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const settings = await client.getSettings(guildId);
        const prefix = settings?.prefix || client.config.prefix || '+';
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Missing Permissions__\n` +
                                `> ${emojis.star || ''} You need to be an **Administrator** to use this command.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        
        const alertContent = args.slice(1).join(' ');
        const targetId = args[0]?.replace(/[<@!>]/g, '');

        if (!targetId || !alertContent) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Missing Information__\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${prefix}alert\` <user> <message>\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${prefix}alert\` @user Please join the voice for verification.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const targetMember = await resolveMember(message, args[0]);
        if (!targetMember) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Member Not Found__\n` +
                                `> ${emojis.star || ''} Could not find that member in this server.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const serverIcon = message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL();

        const dmContainer = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.title} __Official Notice__\n\n` +
                            `> ${emojis.star} **__Server:__** **${message.guild.name}**\n` +
                            `> ${emojis.star} **__From:__** Staff Team\n\n` +
                            `## ${emojis.title} **__Message:__**\n` +
                            `> \`\`\`${alertContent}\`\`\`\n\n` +
                            `> ${emojis.title || ''} *Please take note of this message from the administration.*`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(serverIcon)
                    )
            );

        try {
            await targetMember.send({
                components: [dmContainer],
                flags: MessageFlags.IsComponentsV2
            });

            const successContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Alert Sent__\n` +
                                `> ${emojis.star || ''} Successfully sent alert to <@${targetId}>\n` +
                                `> ${emojis.star || ''} **__Content:__** ${alertContent}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
            const failContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Alert Failed__\n` +
                                `> ${emojis.star || ''} Failed to send DM to <@${targetId}>\n` +
                                `> ${emojis.star || ''} *User might have DMs closed or blocked the bot.*`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [failContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
