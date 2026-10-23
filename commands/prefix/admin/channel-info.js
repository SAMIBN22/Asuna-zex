import { EmbedBuilder, PermissionsBitField } from 'discord.js'

const COOLDOWN_TIME = 5000; // 5 seconds cooldown
const cooldowns = new Map();

export default {
    name: 'channelinfo',
    aliases: ['cinfo', 'channel-info'],
    description: 'Get information about a specific channel, including its settings and permissions',
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
                .setAuthor({ name: 'Command : ChannelInfo', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Retrieve details about a specific channel,\n including its settings and permissions.')
                .addFields(
                    { name: "Aliases:", value: "- cinfo, channel-info", inline: false },
                    { name: "Usage:", value: "- +channelinfo #channel/id", inline: false },
                    { name: "Examples:", value: `- +channelinfo #general\n- +channelinfo 1295076771905142811`, inline: false }
                );
            return message.reply({ embeds: [guideEmbed] });
        }

        const channelInput = args[0];
        let channel;

        if (/^\d+$/.test(channelInput)) {
            // If the input is a channel ID
            channel = message.guild.channels.cache.get(channelInput);
        } else if (message.mentions.channels.size > 0) {
            // If it's a channel mention
            channel = message.mentions.channels.first();
        } else {
            // If it's a channel name
            channel = message.guild.channels.cache.find(c => c.name.toLowerCase() === channelInput.toLowerCase());
        }

        if (!channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('Channel not found.');
            return message.reply({ embeds: [errorEmbed] });
        }

        // Channel Type Mapping
        const channelTypes = {
            0: 'Text Channel',
            2: 'Voice Channel',
            4: 'Category',
            5: 'Announcement Channel',
            13: 'Stage Channel',
            15: 'Forum Channel'
        };

        const channelType = channelTypes[channel.type] || 'Unknown';

        // Extract Permissions
        const permissions = channel.permissionsFor(message.guild.roles.everyone).toArray();
        const importantPermissions = [
            'ViewChannel', 'SendMessages', 'ManageChannels', 'ManageMessages', 
            'Connect', 'Speak', 'MuteMembers', 'DeafenMembers', 'MoveMembers'
        ];

        const filteredPermissions = permissions
            .filter(perm => importantPermissions.includes(perm))
            .map(perm => ` ${perm.replace(/([A-Z])/g, ' $1').trim()}`)
            .join('\n') || ' No important permissions';

        // Channel Information Embed
        const channelEmbed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setAuthor({ name: 'Command : Channel Info', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`Channel Information: **${channel.name}**`)
            .addFields(
                { name: " Channel ID", value: `\`${channel.id}\``, inline: false },
                { name: " Type", value: `${channelType}`, inline: false },
                { name: " Created At", value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`, inline: false },
                { name: " NSFW", value: channel.nsfw ? ' Yes' : ' No', inline: false },
                { name: " Channel Permissions", value: filteredPermissions, inline: false }
            );

        return message.reply({ embeds: [channelEmbed] });
    },
};
