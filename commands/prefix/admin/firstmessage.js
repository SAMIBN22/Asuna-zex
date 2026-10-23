import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

const COOLDOWN_TIME = 5000; // 5 seconds cooldown
const cooldowns = new Map();

export default {
    name: "firstmsj",
    aliases: ["firstmsg", "first-message" ,"firstmessage"],
    description: "Get the first message in the current channel",
    async execute(message) {
        // Check if the user is on cooldown
        if (cooldowns.has(message.author.id)) {
            return message.react(''); // React with a cooldown emoji
        }

        // Set cooldown for the user
        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        try {
            const fetchMessages = await message.channel.messages.fetch({ after: "1", limit: 1 });
            const firstMessage = fetchMessages.first();

            if (!firstMessage) {
                return message.reply({ content: "No messages found in this channel." });
            }

            // Embed for first message info
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: "First Message Info", iconURL: message.guild.iconURL({ dynamic: true }) })
                .setDescription(` **First message in ${message.channel}:**\n\n` +
                    `**Author:** ${firstMessage.author} (${firstMessage.author.tag})\n` +
                    `**Sent:** <t:${Math.floor(firstMessage.createdTimestamp / 1000)}:F>\n` +
                    `**Message Content:** ${firstMessage.content || 'No content'}`)
                .setFooter({ text: `Message ID: ${firstMessage.id}`, iconURL: firstMessage.author.displayAvatarURL({ dynamic: true }) });

            // ActionRow with button to jump to message
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("Go To Message")
                    .setURL(firstMessage.url)
                    .setStyle(ButtonStyle.Link)
            );

            return message.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error("Error fetching first message:", error);
            return message.reply({ content: "An error occurred while fetching the first message." });
        }
    }
};
