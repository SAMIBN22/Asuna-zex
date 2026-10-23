import { EmbedBuilder } from 'discord.js'

export default {
    name: 'banhelp',
    description: 'Show VPN Ban System commands',
    category: 'Admin',

    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setTitle(' VPN Ban System - Commands')
            .setColor(0x0099FF)
            .addFields(
                { name: '-banvpn @user or ID', value: 'Permanently ban a user from the server', inline: false },
                { name: '-unbanvpn <userID>', value: 'Remove the ban from a user', inline: false },
                { name: '-banhelp', value: 'Show this help message', inline: false }
            )
            .setFooter({ text: 'Only the server owner can use banvpn and unbanvpn' });

        message.channel.send({ embeds: [embed] });
    }
};
