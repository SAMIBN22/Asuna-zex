import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { EmbedBuilder } from 'discord.js'

export default {
    name: 'temprole',
    aliases: ['temprole', 'setrolefor'],
    description: 'Assign a role to a user for a specific amount of time',
    async execute(message, args) {
        if (args.length < 3) {
            const guideEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command: TempRole', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Assign a role to a user for a specific amount of time.')
                .addFields(
                    { name: "Aliases:", value: "- temprole, setrolefor", inline: false },
                    { name: "Usage:", value: "- +temprole (user/id) (role/id) (time)", inline: false },
                    { name: "Examples:", value: `- +temprole @user/id @role/id 24h`, inline: false }
                );
            return message.reply({ embeds: [guideEmbed] });
        }

        const userInput = args[0];
        const roleInput = args[1];
        const timeInput = args[2];
        let user;

        if (message.mentions.users.size > 0) {
            user = message.mentions.users.first();
        } else if (/^\d+$/.test(userInput)) {
            try {
                user = await message.client.users.fetch(userInput);
            } catch (error) {
                return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('Invalid user ID or user not found.')] });
            }
        } else {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('Please mention a user or provide a valid user ID.')] });
        }

        const member = message.guild.members.cache.get(user.id);
        if (!member) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('This user is not in this server.')] });
        }

        if (!message.guild.members.me.permissions.has('MANAGE_ROLES')) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('I do not have permission to manage roles.')] });
        }

        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('You do not have permission to manage roles.')] });
        }

        let role;
        if (/^\d+$/.test(roleInput)) {
            role = message.guild.roles.cache.get(roleInput);
        } else if (message.mentions.roles.size > 0) {
            role = message.mentions.roles.first();
        } else {
            role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
        }

        if (!role) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('Role not found.')] });
        }

        const timeInMinutes = parseInt(timeInput);
        if (isNaN(timeInMinutes) || timeInMinutes <= 0) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('Please provide a valid time in minutes.')] });
        }

        try {
            await member.roles.add(role);
            message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription(`Successfully added the role **${role.name}** to ${user.username} for ${timeInMinutes} minutes.`)]
            });

            setTimeout(async () => {
                try {
                    await member.roles.remove(role);
                    message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor('#FFFFFF')
                            .setDescription(`The role **${role.name}** was removed from ${user.username} after ${timeInMinutes} minutes.`)]
                    });
                } catch (err) {
                    console.error(' Error removing role:', err.message);
                }
            }, timeInMinutes * 60 * 1000);
        } catch (err) {
            console.error(' Error adding role:', err.message);
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription('- An error occurred while adding the role.')] });
        }
    },
};
