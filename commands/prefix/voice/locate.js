import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder, TextDisplayBuilder, SectionBuilder,
    ThumbnailBuilder, SeparatorBuilder, MessageFlags
} from 'discord.js';

export default {
    name: 'locate',
    aliases: ['findvoice', 'whereami', 'vclocate'],
    description: 'Show a user\'s current voice channel with all members in it',
    category: 'Voice',
    usage: '&locate [@user]',

    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        let target = await resolveMember(message, args[0]);
        if (!target && args[0]) {
            const query = args[0].replace(/[<@!>]/g, '');
            target = message.guild.members.cache.get(query) ||
                message.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === args[0].toLowerCase() ||
                    m.displayName.toLowerCase() === args[0].toLowerCase()
                );
        }
        if (!target) target = message.member;

        const vc = target.voice.channel;
        if (!vc) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `## ${emojis.info || ''} __Not in Voice__\n` +
                                        `> ${emojis.star || ''} **${target.displayName}** is not currently in any voice channel.`
                                    )
                                )
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 }))
                                )
                        )
                ],
                allowedMentions: { parse: [] }
            });
        }

        const members = vc.members
            .sort((a, b) => {
                if (a.id === target.id) return -1;
                if (b.id === target.id) return 1;
                return a.displayName.localeCompare(b.displayName);
            })
            .map((m, i) => {
                const isSelf = m.id === target.id;
                const muted = m.voice.mute ? '' : '';
                const deafened = m.voice.deaf ? '' : '';
                const streaming = m.voice.streaming ? '' : '';
                const icons = [muted, deafened, streaming].filter(Boolean).join('');
                return `> ${emojis.star || ''} ${isSelf ? '**' : ''}${m.displayName}${isSelf ? ' *(you)*' : ''}${isSelf ? '**' : ''} ${icons}`;
            });

        const memberList = members.slice(0, 20).join('\n');
        const overflow = vc.members.size > 20 ? `\n> *...and ${vc.members.size - 20} more*` : '';
        const userLimit = vc.userLimit ? `${vc.members.size}/${vc.userLimit}` : `${vc.members.size} members`;

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Voice Channel Locate__`)
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${vc.name}\n` +
                                    `> ${emojis.star || ''} **User:** ${target.toString()}\n` +
                                    `> ${emojis.star || ''} **Channel ID:** \`${vc.id}\`\n` +
                                    `> ${emojis.star || ''} **Members:** \`${userLimit}\`\n` +
                                    `> ${emojis.star || ''} **Bitrate:** \`${vc.bitrate / 1000}kbps\``
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ extension: 'png', size: 256 }))
                            )
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} __Members in Channel__\n${memberList}${overflow}`
                        )
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
