import { resolveUser } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'

const cooldowns = new Map(); // Define the cooldown map here
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'gendre',
    aliases: ['genderrate'],
    description: 'Calculate your gender rate! ',
    execute: async (message, args) => {
        // If no arguments are provided, send the usage info
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: gendre', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Calculate your gender rate! ')
                .addFields(
                    { name: "Aliases:", value: "- genderrate", inline: false },
                    { name: "Usage:", value: "- +gendre @user/id", inline: false },
                    { name: "Examples:", value: `- +gendre <@${message.author.id}>\n- +gendre ${message.author.id}`, inline: false }
                );
            return message.reply({ embeds: [embed] });
        }

        // Try to retrieve the target user from mention or user ID
        let targetUser = await resolveUser(message, args[0], client);
        if (!targetUser) {
            targetUser = message.client.users.cache.get(args[0].replace(/[<>@!]/g, ''));
        }
        if (!targetUser) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('Please provide a valid user mention or user ID.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        // Check cooldown
        if (cooldowns.has(message.author.id)) {
            return message.react('');
        }
        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        // Calculate random gender rate percentages
        const maleRate = Math.floor(Math.random() * 101); // Generate a random male percentage between 0 and 100
        const femaleRate = Math.floor(Math.random() * 101); // Generate a random female percentage between 0 and 100
        const gayRate = Math.floor(Math.random() * 101); // Generate a random gay percentage between 0 and 100

        const embed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setTitle(`Let's see how ${targetUser.username}'s gender rate is...`)
            .setDescription(`**Results:** \n\n**Male :**\n\`\`\`${maleRate}%\`\`\`\n**Female :**\n\`\`\`${femaleRate}%\`\`\`\n**Gay ‍:**\n\`\`\`${gayRate}%\`\`\``) // Display all three categories
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 })) // Add the target user's avatar as the thumbnail
            .setTimestamp()
            .setFooter({ text: 'Gender is a spectrum! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        message.channel.send({ embeds: [embed] });
    }
};
