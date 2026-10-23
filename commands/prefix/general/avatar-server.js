import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

const cooldowns = new Map(); // Cooldown map for users
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'serveravatar',
    aliases: ['sa'],
    description: 'Displays the server avatar (icon).',
    async execute(message) {
        // Check if user is on cooldown
        if (cooldowns.has(message.author.id)) {
            // React with a cooldown emoji
            return message.react(''); 
        }

        // Set the cooldown for the user
        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        // Get the server (guild) object
        const guild = message.guild;

        // Get the server icon URL (avatar)
        const serverAvatar = guild.iconURL({ dynamic: true, size: 1024 });

        if (serverAvatar) {
            // Create an embed to show the server avatar
            const avatarEmbed = new EmbedBuilder()
                .setColor('#FFFFFF') // Set a random color
                .setTitle(`${guild.name}'s Avatar`)
                .setURL(serverAvatar) // URL to the server avatar
                .setImage(serverAvatar) // Main image for the server avatar
                .setTimestamp();

            // Create the download button
            const downloadButton = new ButtonBuilder()
                .setLabel('Download Avatar')
                .setStyle(ButtonStyle.Link)  // This makes it open a link
                .setURL(serverAvatar); // URL will be the avatar image URL

            // Create action row for the button
            const row = new ActionRowBuilder().addComponents(downloadButton);

            await message.reply({ embeds: [avatarEmbed], components: [row] });
        } else {
            const noAvatarEmbed = new EmbedBuilder()
                .setColor('#FFFFFF') // Set a color for the error message
                .setDescription('This server does not have an avatar set.');

            await message.reply({ embeds: [noAvatarEmbed] });
        }
    }
};
