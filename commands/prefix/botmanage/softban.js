import { resolveUser } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import emojis from '../../emojis.js';

export default {
    name: 'softban',
    aliases: ['sban', 'softb'],
    description: 'Softban a member — ban then immediately unban to delete their messages',
    category: 'BotManage',
    usage: '&softban <ID|@member|username> [reason]',
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
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&softban <ID|@member|username> [reason]\`**\n` +
                        `> ${emojis.star || ''} Softban bans then immediately unbans the user, deleting their recent messages.`
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

        if (target && !target.bannable) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Cannot Softban__\n> ${emojis.star || ''} I cannot ban **${target.displayName}** — they may have higher permissions.`
                    ))]
            });
        }

        try {
            const banReason = `[SOFTBAN] ${reason} | By: ${message.author.tag}`;
            await message.guild.members.ban(userObj.id, { deleteMessageSeconds: 604800, reason: banReason });
            await message.guild.members.unban(userObj.id, `Softban by ${message.author.tag}`);

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Member Softbanned__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${userObj.username}\n` +
                                `> ${emojis.star || ''} **Action:** Softbanned  *(Banned & Unbanned)*\n` +
                                `> ${emojis.star || ''} **Moderator:** ${message.author.toString()}\n` +
                                `> ${emojis.star || ''} **Reason:** ${reason}\n` +
                                `> ${emojis.star || ''} **Messages Cleared:** Last 7 days`
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
                        `## ${emojis.info || ''} __Softban Failed__\n> ${emojis.star || ''} ${err.message}`
                    ))]
            });
        }
    }
};
