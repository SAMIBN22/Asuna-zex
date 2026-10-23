import { resolveUser } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'
import fetch from 'node-fetch'

const cooldowns = new Map();
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'happy',
    description: 'Send a cute happy anime girl GIF to someone ',
    execute: async (message, args) => {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: happy', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Send someone a **cute happy anime girl GIF!** ')
                .addFields(
                    { name: "Aliases:", value: "- happy", inline: false },
                    { name: "Usage:", value: "- +happy @user/id", inline: false },
                    { name: "Examples:", value: `- +happy <@${message.author.id}>\n- +happy ${message.author.id}`, inline: false }
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
            const response = await fetch('https://api.giphy.com/v1/gifs/search?api_key=iEuG4dzwgPVgbENvfQIb330diPBn3YEm&q=cute+anime+girl+happy&limit=50&offset=0&rating=g&lang=en&bundle=messaging_non_clips');
            const data = await response.json();

            if (!data.data.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No happy anime girl GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Ensure unique GIF
            const usedUrls = new Set();
            const uniqueGifs = data.data.filter(gif => {
                if (usedUrls.has(gif.images.original.url)) {
                    return false; // Skip used GIFs
                }
                usedUrls.add(gif.images.original.url);
                return true;
            });

            if (!uniqueGifs.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- Could not find unique GIFs! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const randomGif = uniqueGifs[Math.floor(Math.random() * uniqueGifs.length)].images.original.url;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`${message.author.username} makes ${targetUser.username} happy! `)
                .setImage(randomGif)
                .setTimestamp()
                .setFooter({ text: 'Stay happy! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('- Could not fetch a cute anime happy GIF at the moment ')
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
