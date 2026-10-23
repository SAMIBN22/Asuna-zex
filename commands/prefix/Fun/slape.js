import { resolveUser } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'

const cooldowns = new Map(); // Define the cooldown map here
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'slape',
    description: 'Slap someone! ',
    execute: async (message, args) => {
        // If no arguments are provided, send the usage info
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: slap', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Slap someone! ')
                .addFields(
                    { name: "Aliases:", value: "- slape", inline: false },
                    { name: "Usage:", value: "- +slape @user/id", inline: false },
                    { name: "Examples:", value: `- +slape <@${message.author.id}>\n- +slape ${message.author.id}`, inline: false }
                );
            return message.reply({ embeds: [embed] });
        }

        // Attempt to retrieve the target user from mention or user ID
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
            const response = await fetch('https://api.giphy.com/v1/gifs/search?api_key=iEuG4dzwgPVgbENvfQIb330diPBn3YEm&q=anime+slap&limit=50&offset=0&rating=g&lang=en&bundle=messaging_non_clips');
            const data = await response.json();
            
            if (!data.data.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No anime slap GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Filter for anime slap GIFs
            const animeSlapGifs = data.data.filter(gif => gif.title.toLowerCase().includes('anime') || gif.slug.toLowerCase().includes('anime'));
            if (!animeSlapGifs.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No specific anime slap GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const randomGif = animeSlapGifs[Math.floor(Math.random() * animeSlapGifs.length)].images.original.url;
            
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`${message.author.username} slaps ${targetUser.username} `)
                .setImage(randomGif)
                .setTimestamp()
                .setFooter({ text: 'Spreading some tough love! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });
            
            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('- Could not fetch an anime slap GIF at the moment ')
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
