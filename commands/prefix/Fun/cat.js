import { EmbedBuilder } from 'discord.js'

const cooldowns = new Map();
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'cat',
    description: 'Send a cute cat GIF to someone ',
    execute: async (message, args) => {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: cat', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Send someone a cute cat GIF! ')
                .addFields(
                    { name: "Aliases:", value: "- cat", inline: false },
                    { name: "Usage:", value: "- +cat @user/id", inline: false },
                    { name: "Examples:", value: `- +cat <@${message.author.id}>\n- +cat ${message.author.id}`, inline: false }
                );
            return message.reply({ embeds: [embed] });
        }

        let targetUser = message.mentions.users.first();
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
            const response = await fetch('https://api.giphy.com/v1/gifs/search?api_key=iEuG4dzwgPVgbENvfQIb330diPBn3YEm&q=cute+cat&limit=50&offset=0&rating=g&lang=en&bundle=messaging_non_clips');
            const data = await response.json();

            if (!data.data.length) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription('- No cat GIFs found! ')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            const catGifs = data.data;
            const randomGif = catGifs[Math.floor(Math.random() * catGifs.length)].images.original.url;

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`${message.author.username} sends a cat to ${targetUser.username} `)
                .setImage(randomGif)
                .setTimestamp()
                .setFooter({ text: 'Cats are the best! ', iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('- Could not fetch a cat GIF at the moment ')
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
