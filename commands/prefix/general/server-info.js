import { EmbedBuilder, PermissionsBitField, GuildVerificationLevel } from 'discord.js'

const cooldowns = new Map(); // Cooldown map for users
const COOLDOWN_TIME = 10000; // 10 seconds cooldown

export default {
    name: 'server',
    aliases: ['s'],
    description: 'Get information about the server.',
    cooldown: 10,
    userPerms: [],
    botPerms: [PermissionsBitField.Flags.ViewChannel],
    async execute(message, args) {
        // Check if the user is on cooldown
        if (cooldowns.has(message.author.id)) {
            return message.react(''); // React with the hourglass emoji to indicate cooldown
        }

        // Set the cooldown for the user
        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        const { guild } = message;

        if (!guild) {
            return message.channel.send('This command can only be used in a server.');
        }

        // Fetch the owner of the server
        const owner = await guild.fetchOwner();

        // Count various attributes
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const roleCount = guild.roles.cache.size;
        const emojiCount = guild.emojis.cache.size;
        const stickerCount = guild.stickers.cache.size;
        const textChannelCount = guild.channels.cache.filter(channel => channel.type === 0).size; // GuildText type
        const voiceChannelCount = guild.channels.cache.filter(channel => channel.type === 2).size; // GuildVoice type
        const totalChannelCount = guild.channels.cache.size; // Total channels
        const banCount = await guild.bans.fetch().then(bans => bans.size).catch(() => 0); // Graceful failure
        const timeoutCount = guild.members.cache.filter(member => member.communicationDisabledUntilTimestamp).size;
        const bannerURL = guild.bannerURL({ size: 2048, format: 'png' }) || 'No Banner';
        const vanityURL = guild.vanityURLCode ? `https://discord.gg/${guild.vanityURLCode}` : 'No Vanity URL';
        const verificationLevel = GuildVerificationLevel[guild.verificationLevel];
        const boostCount = guild.premiumSubscriptionCount || 0;
        const highestRole = guild.roles.cache.sort((a, b) => b.position - a.position).first();
        const serverDescription = guild.description || 'No description available.';

        // Calculate the time since the server was created
        const createdAt = guild.createdAt;
        const createdAtString = `<t:${Math.floor(createdAt.getTime() / 1000)}:R>`;

        // Check if the server has Community features enabled
        const communityEnabled = guild.features.includes('COMMUNITY') ? 'Yes' : 'No';

        // Check for widget information
        const widgetEnabled = guild.widgetEnabled;
        const widgetChannelId = guild.widgetChannelId;
        const widgetURL = widgetEnabled ? `https://discord.com/api/guilds/${guild.id}/widget.png` : 'No Widget Enabled';
        const widgetChannel = widgetChannelId ? `<#${widgetChannelId}>` : 'No Widget Channel';
        const systemChannel = guild.systemChannel;

        // Create an embed with organized fields
        const serverInfoEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: `${guild.name} Information`,
                iconURL: guild.iconURL({ dynamic: true, size: 512 }),
            })
            .setColor('#FFFFFF')
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setImage(bannerURL !== 'No Banner' ? bannerURL : null)
            .setDescription(`**Description**: \`\`\`${serverDescription}\`\`\``)
            .addFields(
                { name: `${guild.name} Info`, value: `**Owner**: <@${owner.id}>\n**ID**: \`${guild.id}\`\n**Creation Info**: ${createdAtString}\n**Special Role**: ${highestRole}\n**Vanity Url**: ${vanityURL}\n**System Channel**: ${systemChannel ? systemChannel.toString() : 'No system channel'}`, inline: false },
                { name: 'Community Features', value: `**Community Enabled**: ${communityEnabled}`, inline: false },
                { name: 'Server Widget', value: `**Widget Enabled**: ${widgetEnabled ? 'Yes' : 'No'}\n**Widget Channel**: ${widgetChannel}\n**Widget URL**: [Widget Url]( ${widgetURL} )`, inline: false },
                { name: 'Moderation & Boosts', value: `**Verification Level**: ${verificationLevel}\n**Boost Count**: \`${boostCount}\``, inline: false },
                { name: 'Statistics', value: `**Member Count**: \`${guild.memberCount}\`\n**Bot Count**: \`${botCount}\`\n**Role Count**: \`${roleCount}\`\n**Emoji Count**: \`${emojiCount}\`\n**Sticker Count**: \`${stickerCount}\``, inline: true },
                { name: 'Channels', value: `**Text Channels**: \`${textChannelCount}\`\n**Voice Channels**: \`${voiceChannelCount}\`\n**Total Channels**: \`${totalChannelCount}\``, inline: true },
                { name: 'Ban & Timeout Stats', value: `**Ban Count**: \`${banCount}\`\n**Timeout Users**: \`${timeoutCount}\``, inline: true },
            )      
            .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL({ dynamic: true, size: 512 }) })
            .setTimestamp();

        await message.channel.send({ embeds: [serverInfoEmbed] });
    }
};
