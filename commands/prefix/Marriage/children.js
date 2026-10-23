import { resolveUser } from '../../../lib/resolveUser.js';
import { MessageFlags } from 'discord.js';
import Marriage from '../../../models/marriage.js';
import { buildMarriageContainer } from '../../../lib/marriage.js';

export default {
    name: 'children',
    aliases: ['kids'],
    description: "View your (or another user's) children",
    category: 'Marriage',
    usage: '&children [user]',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        const target = (await resolveUser(message, args[0], client)) || message.author;

        const marriage = await Marriage.findByUser(guildId, target.id);
        if (!marriage) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Children', `${target.id === message.author.id ? 'You are' : `${target.username} is`} not married, so there are no children to show.`, target.displayAvatarURL({ extension: 'png' }), client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (marriage.children.length === 0) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Children', `${target.id === message.author.id ? 'You' : target.username} have no children yet. Use \`&adopt <name>\` to adopt one.`, target.displayAvatarURL({ extension: 'png' }), client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const list = marriage.children
            .map((c, i) => `> **${i + 1}.** ${c.name} — <t:${Math.floor(c.addedAt.getTime() / 1000)}:D>`)
            .join('\n');

        return message.reply({
            components: [buildMarriageContainer(theme, `${target.username}'s Children`, list, target.displayAvatarURL({ extension: 'png' }), client)],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
