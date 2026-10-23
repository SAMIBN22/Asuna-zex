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

export default {
    name: 'addperm',
    aliases: ['addperm'],
    description: 'Add permissions to a user or role in the current channel.',
    usage: '&addperm <@user|@role>',
    category: 'Admin',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const roleId = message.mentions.roles.first()?.id;
        const target = roleId ? message.guild.roles.cache.get(roleId) : await resolveMember(message, args[0]);

        if (!target) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&addperm <@user|@role>\`**`
                            )
                        )
                ]
            });
        }

        try {
            await message.channel.permissionOverwrites.edit(target, {
                ViewChannel: true,
                SendMessages: true,
                Connect: true,
                Speak: true,
            });

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.yes || ''} __Permissions Added__\n` +
                                        `> ${emojis.star || ''} **Target:** ${target.toString?.() || target.name}\n` +
                                        `> ${emojis.star || ''} **Channel:** ${message.channel}\n` +
                                        `> ${emojis.star || ''} **Granted:** View, Send Messages, Connect, Speak`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 256 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        } catch (err) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ${emojis.info || ''} __Failed__\n> ${emojis.star || ''} Could not update permissions: ${err.message}`
                            )
                        )
                ]
            });
        }
    }
};
