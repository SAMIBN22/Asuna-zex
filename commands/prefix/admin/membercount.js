import { EmbedBuilder } from 'discord.js'

export default {
    name: 'membercount',
    aliases: ['mcount', 'members'],
    description: 'Get the total number of members in the server',
    async execute(message) {
        const { guild } = message;

        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(member => !member.user.bot).size;
        const bots = guild.members.cache.filter(member => member.user.bot).size;

        const memberEmbed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setAuthor({ name: 'Command : Member Count', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`Server Members Information for **${guild.name}**`)
            .addFields(
                { name: "Users", value: `\`${totalMembers}\``, inline: false },
                { name: "Humans", value: `\`${humans}\``, inline: false },
                { name: "Bots", value: `\`${bots}\``, inline: false }
            )
            .setThumbnail(guild.iconURL({ dynamic: true }));

        return message.reply({ embeds: [memberEmbed] });
    },
};
