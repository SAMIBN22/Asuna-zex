import { resolveUser } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'

const cooldowns = new Map();
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'smile',
    description: 'Send an anime smile to someone ',
    execute: async (message, args) => {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: smile', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Make someone smile! ')
                .addFields(
                    { name: "Aliases:", value: "- smile", inline: false },
                    { name: "Usage:", value: "- +smile @user/id", inline: false },
                    { name: "Examples:", value: `- +smile <@${message.author.id}>\n- +smile ${message.author.id}`, inline: false }
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
            const response = await fetch('https://api.giphy.com/v1/gifs/search?api_key=iEuG4dzwgPVgbENvfQIb330diPBn3YEm&q=anime+smile&limit=50&offset=0&rating=g&lang=en&bundle=messaging_non_clips');
            const data = await response.json();

            if (!data.data.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No anime smile GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const animeSmileGifs = data.data.filter(gif => gif.title.toLowerCase().includes('anime') || gif.slug.toLowerCase().includes('anime'));
            if (!animeSmileGifs.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No specific anime smile GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const randomGif = animeSmileGifs[Math.floor(Math.random() * animeSmileGifs.length)].images.original.url;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`${message.author.username} smiles at ${targetUser.username} `)
                .setImage(randomGif)
                .setTimestamp()
                .setFooter({ text: 'Keep smiling! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('- Could not fetch an anime smile GIF at the moment ')
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
