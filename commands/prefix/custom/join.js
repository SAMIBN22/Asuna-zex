import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionsBitField
} from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';

import GuildConfig from '../../../models/guildConfig.js';

// Permissions that qualify a member as "high-ranking" (i.e. senior staff)
// for the purpose of this command. Administrator or Manage Server access
// is the standard bar for granting voice-control privileges.
const SENIOR_STAFF_PERMISSIONS = [
    PermissionsBitField.Flags.Administrator,
    PermissionsBitField.Flags.ManageGuild,
];

function hasSeniorRole(member) {
    return SENIOR_STAFF_PERMISSIONS.some((permission) => member.permissions.has(permission));
}

export default {
    name: 'join',
    description: "Make the bot join a voice channel",
    category: 'BotManage',
    usage: '+join [channel_id]',
    aliases: ['botjoin', 'vcconnect'],
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis || {};
        const themeColor = client.themeManager.getRGBColor(theme.color);
        const guildConfig = await GuildConfig.findOne({ guildId });

        const isPermitted =
            client.config.devIds.includes(message.author.id) ||
            guildConfig?.customPermitUsers?.includes(message.author.id) ||
            hasSeniorRole(message.member);

        if (!isPermitted) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Permission Denied__\n` +
                                `> ${emojis.star || ''} This command is restricted to senior staff members with **Administrator** or **Manage Server** permissions.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const voiceChannel = message.member.voice.channel || (args[0] ? await message.guild.channels.fetch(args[0]).catch(() => null) : null);
        
        if (!voiceChannel || voiceChannel.type !== 2) { // 2 = GuildVoice
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __How To Use__\n` +
                                `> ${emojis.star || ''} **__Usage:__** \`${client.config.prefix}join\` [channel_id]\n` +
                                `> ${emojis.star || ''} **__Note:__** You must be in a voice channel or provide a valid Voice Channel ID.`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __Voice Joined__\n` +
                                `> ${emojis.star || ''} Successfully joined **<#${voiceChannel.id}>**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ dynamic: true }))
                        )
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.title || ''} __System Error__\n` +
                                `> ${emojis.star || ''} Failed to join voice channel: \`${error.message}\``
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
