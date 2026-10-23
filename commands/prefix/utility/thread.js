import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'thread',
    description: 'Create a simulated thread post',
    category: 'Utility',
    usage: 'thread <message> [| @user]',
    aliases: ['tpost'],
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
                        `> ${emojis.star || ''} **\`&thread message\`**\n` +
                        `> ${emojis.star || ''} **\`&thread message | @user\`**\n` +
                        `> ${emojis.star || ''} **Example:** \`&thread Hello everyone! | @user\``
                    ))]
            });
        }

        const fullInput = args.join(' ');
        const parts = fullInput.split('|');
        const threadMessage = parts[0].trim();
        const targetInput = parts[1]?.trim();

        let author = message.member;

        if (targetInput) {
            const mentionMatch = targetInput.match(/\d+/);
            if (mentionMatch) {
                const found = message.guild.members.cache.get(mentionMatch[0]) ||
                    await message.guild.members.fetch(mentionMatch[0]).catch(() => null);
                if (found) author = found;
            }
        }

        const timestamp = `<t:${Math.floor(Date.now() / 1000)}:t>`;

        return message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${author.displayName}\n` +
                                `> ${emojis.star || ''} ${threadMessage.slice(0, 500)}\n` +
                                `> -# ${timestamp} · #${message.channel.name}`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(author.user.displayAvatarURL({ extension: 'png', size: 256 })))
                    )
            ],
            allowedMentions: { parse: [] }
        });
    }
};
