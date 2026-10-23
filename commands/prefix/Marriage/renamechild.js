import { MessageFlags } from 'discord.js';
import Marriage from '../../../models/marriage.js';
import { buildMarriageContainer } from '../../../lib/marriage.js';

export default {
    name: 'renamechild',
    aliases: [],
    description: 'Rename one of your children',
    category: 'Marriage',
    usage: '&renamechild <old name>, <new name>',
    guildOnly: true,

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);

        const marriage = await Marriage.findByUser(guildId, message.author.id);
        if (!marriage) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Rename Child', 'You are not married and have no children.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const raw = args.join(' ');
        const [oldNameRaw, newNameRaw] = raw.split(',');
        const oldName = oldNameRaw?.trim();
        const newName = newNameRaw?.trim();

        if (!oldName || !newName) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Rename Child', 'Please provide both the current and new names, separated by a comma.\n> **Usage:** `&renamechild <old name>, <new name>`', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (newName.length > 32) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Rename Child', 'Child names must be 32 characters or fewer.', null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const child = marriage.children.find(c => c.name.toLowerCase() === oldName.toLowerCase());
        if (!child) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Rename Child', `No child named **${oldName}** was found.`, null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (marriage.children.some(c => c.name.toLowerCase() === newName.toLowerCase() && c !== child)) {
            return message.reply({
                components: [buildMarriageContainer(theme, 'Rename Child', `You already have a child named **${newName}**.`, null, client)],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const previous = child.name;
        child.name = newName;
        await marriage.save();

        return message.reply({
            components: [buildMarriageContainer(theme, 'Child Renamed', `> **${previous}** has been renamed to **${newName}**.`, null, client)],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
