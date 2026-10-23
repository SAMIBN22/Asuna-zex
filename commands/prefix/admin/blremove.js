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
    name: 'blremove',
    aliases: ['unblmove', 'removebl'],
    description: 'Remove a member from the blacklist.',
    usage: '&blremove <@user|ID>',
    category: 'Admin',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&blremove <@user|ID>\`**`
                            )
                        )
                ]
            });
        }

        const config = await GuildConfig.findOneAndUpdate(
            { guildId: message.guild.id },
            { $pull: { moveBlacklist: targetId } },
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
                                    `## ${emojis.yes || ''} __Blacklist Updated__\n` +
                                    `> ${emojis.star || ''} **Member:** <@${targetId}>\n` +
                                    `> ${emojis.star || ''} This user can now be targeted by \`&move\` / \`&massmove\` again.\n` +
                                    `> ${emojis.star || ''} **Blacklisted Total:** \`${config.moveBlacklist.length}\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
