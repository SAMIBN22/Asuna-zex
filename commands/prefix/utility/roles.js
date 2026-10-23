import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'roles',
    description: 'Display all server roles with their info',
    category: 'Utility',
    usage: 'roles',
    aliases: ['rolelist', 'allroles'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        const roles = message.guild.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position);

        const roleList = roles.map(r =>
            `> ${emojis.star || ''} ${r.toString()} — \`${r.members.size} members\``
        ).slice(0, 25).join('\n');

        const moreCount = roles.size > 25 ? `\n> *...and ${roles.size - 25} more roles*` : '';

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Server Roles__`))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${message.guild.name}\n` +
                                `> ${emojis.star || ''} **Total Roles:** \`${roles.size}\`\n` +
                                `> ${emojis.star || ''} **Showing:** Top ${Math.min(25, roles.size)} roles`
                            ))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.guild.iconURL({ extension: 'png', size: 256 }) || client.user.displayAvatarURL()))
                    )
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.star || ''} __Role List__\n${roleList}${moreCount}`
                    ))
            ],
            allowedMentions: { parse: [] }
        });
    }
};
