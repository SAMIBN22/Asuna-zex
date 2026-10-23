import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits
} from 'discord.js';
import emojis from '../../emojis.js';

export default {
    name: 'nickname',
    aliases: ['nick', 'setnick', 'changenick'],
    description: 'Change a member\'s nickname (or your own)',
    category: 'BotManage',
    usage: '&nickname <@user|ID|username> <nickname>  |  &nickname <nickname> (change your own)',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n` +
                        `> ${emojis.star || ''} **Change others:** \`&nickname <@user|ID|username> <new nickname>\`\n` +
                        `> ${emojis.star || ''} **Change own:** \`&nickname <new nickname>\`\n` +
                        `> ${emojis.star || ''} **Reset nickname:** \`&nickname <@user|ID> reset\``
                    ))]
            });
        }

        // Determine if first arg is a user or part of the nickname
        const query = args[0].replace(/[<@!>]/g, '');
        let target = await resolveMember(message, args[0]);
        let newNick;

        if (target && target.id !== message.member.id) {
            // Changing someone else's nick — requires ManageNicknames
            if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                return message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Permission Denied__\n> ${emojis.star || ''} You need **Manage Nicknames** to change others' nicknames.`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ extension: 'png', size: 256 })))
                        )],
                    allowedMentions: { parse: [] }
                });
            }
            newNick = args.slice(1).join(' ');
        } else {
            // Changing own nick
            target = message.member;
            newNick = args.join(' ');
            // Check if ManageNicknames was intended (first arg was another user)
        }

        const isReset = newNick.toLowerCase() === 'reset';

        if (!isReset && (!newNick || newNick.length > 32)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Invalid Nickname__\n> ${emojis.star || ''} Nickname must be between 1-32 characters.`
                    ))]
            });
        }

        try {
            const oldNick = target.displayName;
            await target.setNickname(isReset ? null : newNick);

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Nickname Changed__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${target.user.username}\n` +
                                `> ${emojis.star || ''} **Before:** ${oldNick}\n` +
                                `> ${emojis.star || ''} **After:** ${isReset ? '*(reset)*' : newNick}\n` +
                                `> ${emojis.star || ''} **Changed by:** ${message.author.toString()}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 })))
                        )
                ],
                allowedMentions: { parse: [] }
            });
        } catch (err) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Failed__\n> ${emojis.star || ''} ${err.message}`
                    ))]
            });
        }
    }
};
