import { resolveUser } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import emojis from '../../emojis.js';

export default {
    name: 'dmban',
    aliases: ['banwithdm', 'dmb'],
    description: 'Ban a member and send them a DM notification before banning',
    category: 'BotManage',
    usage: '&dmban <ID|@member|username> [reason]',
    cooldown: 30,

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Permission Denied__\n> ${emojis.star || ''} You need **Ban Members** permission.`
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
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&dmban <ID|@member|username> [reason]\`**`
                    ))]
            });
        }

        const query = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'No reason provided';

        let target = message.guild.members.cache.get(query) ||
            message.guild.members.cache.find(m => m.user.username.toLowerCase() === args[0].toLowerCase()) ||
            await message.guild.members.fetch(query).catch(() => null);

        let userObj = target?.user;
        if (!target) {
            userObj = await client.users.fetch(query).catch(() => null);
            if (!userObj) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __User Not Found__\n> ${emojis.star || ''} Could not find: \`${args[0]}\``
                        ))]
                });
            }
        }

        if (target) {
            if (!target.bannable) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Cannot Ban__\n> ${emojis.star || ''} I cannot ban **${target.displayName}** — they may have higher permissions.`
                        ))]
                });
            }
        }

        // Send DM before ban
        let dmSent = false;
        try {
            await userObj.send({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.ban} __You Have Been Banned__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `> ${emojis.star || ''} **Server:** ${message.guild.name}\n` +
                            `> ${emojis.star || ''} **Moderator:** ${message.author.tag}\n` +
                            `> ${emojis.star || ''} **Reason:** ${reason}`
                        ))
                ]
            });
            dmSent = true;
        } catch (_) { dmSent = false; }

        try {
            await message.guild.members.ban(userObj.id, { reason: `${reason} | By: ${message.author.tag}` });

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || emojis.ban} __Member Banned__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${userObj.username}\n` +
                                `> ${emojis.star || ''} **Action:** Banned ${emojis.ban}\n` +
                                `> ${emojis.star || ''} **Moderator:** ${message.author.toString()}\n` +
                                `> ${emojis.star || ''} **Reason:** ${reason}\n` +
                                `> ${emojis.star || ''} **DM Sent:** ${dmSent ? ' Yes' : ' No (DMs closed)'}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(userObj.displayAvatarURL({ extension: 'png', size: 256 })))
                        )
                ],
                allowedMentions: { parse: [] }
            });
        } catch (err) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Ban Failed__\n> ${emojis.star || ''} ${err.message}`
                    ))]
            });
        }
    }
};
