import { resolveUser } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'
import fetch from 'node-fetch'

const cooldowns = new Map();
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'missyou',
    description: 'Send an anime "miss you" moment to someone ',
    execute: async (message, args) => {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: missyou', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Show someone you miss them. ')
                .addFields(
                    { name: "Aliases:", value: "- missyou", inline: false },
                    { name: "Usage:", value: "- +missyou @user/id", inline: false },
                    { name: "Examples:", value: `- +missyou <@${message.author.id}>\n- +missyou ${message.author.id}`, inline: false }
                );
            return message.reply({ embeds: [embed] });
        }

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

        if (cooldowns.has(message.author.id)) {
            return message.react('');
        }
        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        try {
            const response = await fetch('https://api.giphy.com/v1/gifs/search?api_key=iEuG4dzwgPVgbENvfQIb330diPBn3YEm&q=anime+holding+hands&limit=50&offset=0&rating=g&lang=en');
            const data = await response.json();

            if (!data.data.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No anime "miss you" GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const randomGif = data.data[Math.floor(Math.random() * data.data.length)].images.original.url;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`${message.author.username} misses ${targetUser.username} `)
                .setImage(randomGif)
                .setTimestamp()
                .setFooter({ text: 'Hold on tight! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('- Could not fetch an anime "miss you" GIF at the moment ')
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
