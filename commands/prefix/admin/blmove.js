import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'blmove',
    aliases: ['blmove'],
    description: 'Blacklist a member from move command.',
    usage: '&blmove <@user|ID>',
    category: 'Admin',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const target = await resolveMember(message, args[0]);
        const targetId = target?.id ?? args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&blmove <@user|ID>\`**`
                            )
                        )
                ]
            });
        }


        const config = await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { $addToSet: { moveBlacklist: targetId } },
            { upsert: true, new: true, strict: false }
        );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Move Blacklist Updated__\n` +
                                    `> ${emojis.star || ''} **Member:** <@${targetId}>\n` +
                                    `> ${emojis.star || ''} This user can no longer be targeted by \`&move\` / \`&massmove\`.\n` +
                                    `> ${emojis.star || ''} **Blacklisted Total:** \`${config.moveBlacklist.length}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL((target?.user || client.user).displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
