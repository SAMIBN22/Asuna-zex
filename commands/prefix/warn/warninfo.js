import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags
} from 'discord.js';
import Warn from '../../../models/warn.js';

export default {
    name: 'warninfo',
    description: 'Check warnings for a user',
    category: 'Warn',
    usage: '+warninfo <user>',
    aliases: ['warnings', 'winfo'],
    requiredRoles: 'warnerRoleIds',
    guildOnly: true,
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const targetUserArg = args[0] || message.author.id;

        let targetUser;
        try {
            const member = await resolveMember(message, targetUserArg);
            if (member) {
                targetUser = member.user;
            } else {
                targetUser = await client.users.fetch(targetUserArg).catch(() => null);
            }
        } catch (e) {
            targetUser = null;
        }

        if (!targetUser) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __User Not Found__\n\n` +
                                `> ${emojis.star || ''} **__Could not find that user.__**\n` +
                                `> ${emojis.star || ''} __Please provide a valid Mention or ID.__`
                            )
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 || 0 }).catch(() => {});
        }

        const activeWarns = await Warn.find({
            guildId,
            userId: targetUser.id,
            active: true
        }).sort({ date: -1 });

        const historyWarns = await Warn.find({
            guildId,
            userId: targetUser.id,
            active: false
        }).sort({ date: -1 }).limit(5);

        let activeContent = '';
        if (activeWarns.length > 0) {
            activeContent = activeWarns.map((w, i) =>
                `> ${emojis.star || ''} **__${i + 1}. Type:__ ${w.type}**\n` +
                `> ${emojis.right || ''} **Reason:** ${w.reason}\n` +
                `> ${emojis.right || ''} **Date:** <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`
            ).join('\n\n');
        } else {
            activeContent = `> ${emojis.star || ''} __No active warnings.__`;
        }

        let historyContent = '';
        if (historyWarns.length > 0) {
            historyContent = historyWarns.map((w, i) =>
                `> ${emojis.star || ''} **__${i + 1}. Type:__ ${w.type}**\n` +
                `> ${emojis.right || ''} **Reason:** ${w.reason}\n` +
                `> ${emojis.right || ''} **Date:** <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`
            ).join('\n\n');
        }

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${emojis.title || ''} __User Warnings__\n\n` +
                            `> ${emojis.star || ''} **__User:__ <@${targetUser.id}> (\`${targetUser.id}\`)**`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ extension: 'png', size: 512 }) || client.user.displayAvatarURL())
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Active Warnings__\n\n` +
                            activeContent
                        )
                    )
            );

        if (historyWarns.length > 0) {
            container
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.title || ''} __Recent History (Inactive)__\n\n` +
                                historyContent
                            )
                        )
                );
        }

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
