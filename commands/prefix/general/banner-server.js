import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

const cooldowns = new Map(); // Cooldown map for users
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
    name: 'serverbanner',
    aliases: ['sb'],
    description: 'Displays the server banner.',
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

        // Get the server banner URL
        const serverBanner = guild.bannerURL({ size: 1024 });

        if (serverBanner) {
            // Create an embed to show the server banner
            const bannerEmbed = new EmbedBuilder()
                .setColor('#FFFFFF') // Set a random color
                .setTitle(`${guild.name}'s Banner`)
                .setURL(serverBanner) // URL to the server banner
                .setImage(serverBanner) // Main image for the server banner
                .setTimestamp();

            // Create the download button
            const downloadButton = new ButtonBuilder()
                .setLabel('Download Banner')
                .setStyle(ButtonStyle.Link)  // This makes it open a link
                .setURL(serverBanner); // URL will be the banner image URL

            // Create action row for the button
            const row = new ActionRowBuilder().addComponents(downloadButton);

            await message.reply({ embeds: [bannerEmbed], components: [row] });
        } else {
            const noBannerEmbed = new EmbedBuilder()
                .setColor('#FFFFFF') // Set a color for the error message
                .setDescription('This server does not have a banner set.');

            await message.reply({ embeds: [noBannerEmbed] });
        }
    }
};
