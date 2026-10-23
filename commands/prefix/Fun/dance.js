import { resolveUser } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'
import fetch from 'node-fetch'

const cooldowns = new Map(); // Define the cooldown map here
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'dance',
    description: 'Send a cute dancing anime girl GIF ',
    execute: async (message, args) => {
        // If no arguments are provided, send the usage info
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: dance', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Send a dancing anime girl. ')
                .addFields(
                    { name: "Aliases:", value: "- dance", inline: false },
                    { name: "Usage:", value: "- +dance @user/id", inline: false },
                    { name: "Examples:", value: `- +dance <@${message.author.id}>\n- +dance ${message.author.id}`, inline: false }
                );
            return message.reply({ embeds: [embed] });
        }

        // Try to retrieve target user from mention or user ID
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

        try {
            const response = await fetch('https://api.giphy.com/v1/gifs/search?api_key=iEuG4dzwgPVgbENvfQIb330diPBn3YEm&q=anime+dancing+girl&limit=50&offset=0&rating=g&lang=en');
            const data = await response.json();

            if (!data.data.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No dancing anime girl GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Filter for dancing anime girl GIFs
            const dancingAnimeGifs = data.data.filter(gif => gif.title.toLowerCase().includes('dance') || gif.slug.toLowerCase().includes('dance'));
            if (!dancingAnimeGifs.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No specific dancing anime girl GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const randomGif = dancingAnimeGifs[Math.floor(Math.random() * dancingAnimeGifs.length)].images.original.url;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`${message.author.username} dances with ${targetUser.username} `)
                .setImage(randomGif)
                .setTimestamp()
                .setFooter({ text: 'Let’s dance! ', iconURL: 'https://cdn.discordapp.com/attachments/1060197114648407080/1062261234201871460/anime-dance-icon.png' }); // Dancing anime girl icon URL

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('- Could not fetch a dancing anime girl GIF at the moment ')
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
