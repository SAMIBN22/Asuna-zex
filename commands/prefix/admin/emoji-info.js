import { EmbedBuilder } from 'discord.js'

const COOLDOWN_TIME = 5000; // 5 seconds cooldown
const cooldowns = new Map();

export default {
    name: 'emojiinfo',
    aliases: ['einfo', 'emoji-info'],
    description: 'Get information about a specific emoji',
    async execute(message, args) {
        // Check if the user is on cooldown
        if (cooldowns.has(message.author.id)) {
            return message.react(''); // React with a cooldown emoji
        }

        // Set cooldown for the user
        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        if (args.length < 1) {
            const guideEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command : EmojiInfo', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Retrieve details about a specific emoji.')
                .addFields(
                    { name: "Aliases:", value: "- einfo, emoji-info, emojiinfo", inline: false },
                    { name: "Usage:", value: "- +emojiinfo emoji/id", inline: false },
                    { name: "Examples:", value: `- +emojiinfo \n- +emojiinfo 1295076771905142811`, inline: false }
                );
            return message.reply({ embeds: [guideEmbed] });
        }

        const emojiInput = args[0];
        let emoji;

        // If the input is an emoji ID
        if (/^\d+$/.test(emojiInput)) {
            emoji = message.guild.emojis.cache.get(emojiInput);
        } 
        // If the input is a custom emoji format <:name:id>
        else if (emojiInput.match(/^<a?:\w+:(\d+)>$/)) {
            const emojiId = emojiInput.match(/^<a?:\w+:(\d+)>$/)[1];
            emoji = message.guild.emojis.cache.get(emojiId);
        } 
        // If the input is an emoji name
        else {
            emoji = message.guild.emojis.cache.find(e => e.name.toLowerCase() === emojiInput.toLowerCase());
        }

        if (!emoji) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('Emoji not found.');
            return message.reply({ embeds: [errorEmbed] });
        }

        const emojiEmbed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setAuthor({ name: 'Command : Emoji Info', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`Emoji Information: **${emoji}**`)
            .addFields(
                { name: " Emoji Name", value: `\`${emoji.name}\``, inline: false },
                { name: " Emoji ID", value: `\`${emoji.id}\``, inline: false },
                { name: " Animated", value: emoji.animated ? ' Yes' : ' No', inline: false },
                { name: " Created At", value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:F>`, inline: false },
                { name: " URL", value: `[Click Here](${emoji.url})`, inline: false }
            )
            .setThumbnail(emoji.url);

        return message.reply({ embeds: [emojiEmbed] });
    },
};
