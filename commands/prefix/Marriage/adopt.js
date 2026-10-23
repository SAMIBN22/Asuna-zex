import { MessageFlags } from 'discord.js';
import Marriage from '../../../models/marriage.js';
import { buildMarriageContainer } from '../../../lib/marriage.js';

export default {
    name: 'adopt',
    aliases: [],
    description: 'Adopt a child with your partner',
    category: 'Marriage',
    usage: '&adopt <name>',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        const marriage = await Marriage.findByUser(guildId, message.author.id);
        if (!marriage) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Adopt', 'You must be married before you can adopt a child. Use `&marry <user>` first.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const name = args.join(' ').trim();
        if (!name) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Adopt', 'Please provide a name for the child.\n> **Usage:** `&adopt <name>`', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (name.length > 32) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Adopt', 'Child names must be 32 characters or fewer.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (marriage.children.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Adopt', `You already have a child named **${name}**.`, null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        marriage.children.push({ name, addedAt: new Date() });
        await marriage.save();

        return message.reply({
            components: [buildMarriageContainer(theme, 'Adoption Successful', `>  Congratulations! You've adopted **${name}**.\n> Your family now has ${marriage.children.length} child${marriage.children.length !== 1 ? 'ren' : ''}.`, null, client)],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
