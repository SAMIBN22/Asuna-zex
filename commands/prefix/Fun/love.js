import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'

const cooldowns = new Map(); // Define the cooldown map here
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'love',
    aliases: ['lovecalc', 'lc'], // Aliases added
    description: 'Calculate love percentage between two users using their IDs or the sender and another user. ',
    execute: async (message, args) => {
        // If no argument is given, return usage information
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: ' Command: love', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(' Calculate the love percentage between two users. ')
                .addFields(
                    { name: "Aliases:", value: "- lovecalc, lc", inline: false },
                    { name: "Usage:", value: "- +love @user/id", inline: false },
                    { name: "Examples:", value: `- +love <@${message.author.id}>\n- +love ${message.author.id}`, inline: false }
                );
            return message.reply({ embeds: [embed] });
        }

        // If there are two arguments (user IDs), calculate the love percentage between those two users
        if (args.length === 2) {
            const user1 = message.client.users.cache.get(args[0]);
            const user2 = message.client.users.cache.get(args[1]);

            if (!user1 || !user2) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('Please provide valid user IDs for both users to calculate the love percentage!')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const lovePercentage = Math.floor(Math.random() * 100) + 1;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription(` **${user1.username}  ${user2.username}** = **${lovePercentage}%** of Love `)
                .setTimestamp()
                .setFooter({ text: ' Spread the love! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            return message.reply({ embeds: [embed] });
        }

        // If there is only one argument (user ID or mention), calculate the love percentage between sender and mentioned user
        if (args.length === 1) {
            const targetUser = await resolveMember(message, args[0]);
            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('Please mention a valid user or provide a user ID.')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const lovePercentage = Math.floor(Math.random() * 100) + 1;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription(` **${message.author.username}  ${targetUser.username}** = **${lovePercentage}%** of Love `)
                .setTimestamp()
                .setFooter({ text: ' Spread the love! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            return message.reply({ embeds: [embed] });
        }
    }
};
