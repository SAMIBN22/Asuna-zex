import { resolveUser } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'
import fetch from 'node-fetch'

const cooldowns = new Map(); // Define the cooldown map here
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'cringe',
    description: 'Send a cringe anime GIF ‍',
    execute: async (message, args) => {
        // If no arguments are provided, send the usage info
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: cringe', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Send a cringe anime moment. ‍')
                .addFields(
                    { name: "Aliases:", value: "- cringe", inline: false },
                    { name: "Usage:", value: "- +cringe @user/id", inline: false },
                    { name: "Examples:", value: `- +cringe <@${message.author.id}>\n- &cringe ${message.author.id}`, inline: false }
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
            const response = await fetch('https://api.giphy.com/v1/gifs/search?api_key=iEuG4dzwgPVgbENvfQIb330diPBn3YEm&q=cringe+anime+girl&limit=50&offset=0&rating=g&lang=en&bundle=messaging_non_clips');
            const data = await response.json();

            if (!data.data.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No cringe anime GIFs found! ‍')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Filter for cringe anime girl GIFs
            const cringeAnimeGifs = data.data.filter(gif => gif.title.toLowerCase().includes('cringe') || gif.slug.toLowerCase().includes('cringe'));
            if (!cringeAnimeGifs.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No specific cringe anime GIFs found! ‍')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const randomGif = cringeAnimeGifs[Math.floor(Math.random() * cringeAnimeGifs.length)].images.original.url;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`${message.author.username} cringes with ${targetUser.username} ‍`)
                .setImage(randomGif)
                .setTimestamp()
                .setFooter({ text: 'Cringe moments... ', iconURL: 'https://cdn.discordapp.com/attachments/1060197114648407080/1062261234201871460/anime-cringe-icon.png' });

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('- Could not fetch a cringe anime GIF at the moment ‍')
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
