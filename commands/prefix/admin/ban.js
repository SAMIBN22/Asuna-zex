import { resolveUser } from '../../../lib/resolveUser.js';
import emojis from '../../emojis.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: "ban",
    aliases: ["banuser", "banmember"],
    description: "Ban a user from the server",
    category: "Admin",
    usage: "+ban <user_id/mention> [reason]",

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                                `> ${emojis.star || ''} **__You need the Ban Members permission__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                                `> ${emojis.star || ''} **__I need the Ban Members permission__**\n` +
                                `> ${emojis.star || ''} **__to perform this action in this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!args[0]) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __How To Use__\n\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}ban <@user> [reason]\`\n` +
                                `> ${emojis.star || ''} **__Example:__** \`${client.config.prefix}ban ${message.author.id} Toxicity\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const targetUser = await resolveUser(message, args[0], client);
        if (!targetUser) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __User Not Found__\n\n` +
                                `> ${emojis.star || ''} **__Could not find that user.__**\n` +
                                `> ${emojis.star || ''} **__Please check the ID or mention.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const targetId = targetUser.id;
        const targetMember = message.guild.members.cache.get(targetId);
        if (targetMember) {
            if (targetId === message.author.id || targetId === message.guild.ownerId) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __Target Error__\n\n` +
                                    `> ${emojis.star || ''} **__You cannot ban yourself__**\n` +
                                    `> ${emojis.star || ''} **__or the server owner.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                                    `> ${emojis.star || ''} **__You cannot ban someone with a__**\n` +
                                    `> ${emojis.star || ''} **__higher or equal role than yours.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                                    `> ${emojis.star || ''} **__I cannot ban this member because__**\n` +
                                    `> ${emojis.star || ''} **__their role is higher or equal to mine.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }

        const reason = args.slice(1).join(" ") || "No reason provided";
        const bans = await message.guild.bans.fetch().catch(() => new Map());

        if (bans.has(targetId)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Already Banned__\n\n` +
                                `> ${emojis.star || ''} **__This user <@${targetId}> is already__**\n` +
                                `> ${emojis.star || ''} **__banned from this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // Send DM
        try {
            const dmContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.lock} __Banned Status__\n\n` +
                                `> ${emojis.star || ''} **__Server:__** **${message.guild.name}**\n` +
                                `> ${emojis.star || ''} **__Reason:__** **${reason}**\n\n` +
                                `> ${emojis.clouds} *If you believe this was an error, please contact administrators.*`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
                        )
                );
            await targetUser.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
        } catch (e) {
            // Ignore DM failures
        }

        try {
            await message.guild.members.ban(targetId, { reason });
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.yes || ''} __Ban Success__\n\n` +
                                `> ${emojis.star || ''} **__Successfully banned <@${targetId}>__**\n` +
                                `> ${emojis.star || ''} **__Reason: ${reason}__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error('[Ban Command Error]:', error);
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Ban Error__\n\n` +
                                `> ${emojis.star || ''} **__Failed to ban user:__**\n` +
                                `> ${emojis.star || ''} **__${error.message}__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
