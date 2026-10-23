import { MessageFlags } from 'discord.js';
import Marriage from '../../../models/marriage.js';
import { buildMarriageContainer } from '../../../lib/marriage.js';

export default {
    name: 'removechildren',
    aliases: ['removechild', 'disown'],
    description: 'Remove a child from your family',
    category: 'Marriage',
    usage: '&removechildren <name>',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        const marriage = await Marriage.findByUser(guildId, message.author.id);
        if (!marriage) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Remove Child', 'You are not married and have no children.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const name = args.join(' ').trim();
        if (!name) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Remove Child', 'Please provide the name of the child to remove.\n> **Usage:** `&removechildren <name>`', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const index = marriage.children.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
        if (index === -1) {
            const available = marriage.children.length > 0
                ? `\n> Available: ${marriage.children.map(c => c.name).join(', ')}`
                : '\n> You have no children.';
            return message.reply({
                components: [buildMarriageContainer(theme, 'Remove Child', `No child named **${name}** was found.${available}`, null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const [removed] = marriage.children.splice(index, 1);
        await marriage.save();

        return message.reply({
            components: [buildMarriageContainer(theme, 'Child Removed', `> **${removed.name}** has been removed from your family.`, null, client)],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
