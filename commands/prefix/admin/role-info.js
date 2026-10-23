import { EmbedBuilder, PermissionsBitField } from 'discord.js'

export default {
    name: 'roleinfo',
    aliases: ['rinfo', 'role-info'],
    description: 'Get information about a specific role, including permissions',
    async execute(message, args) {
        if (args.length < 1) {
            const guideEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command : RoleInfo', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription('Retrieve details about a specific role,\n including permissions.')
                .addFields(
                    { name: "Aliases:", value: "- rinfo, role-info", inline: false },
                    { name: "Usage:", value: "- +roleinfo @role/id", inline: false },
                    { name: "Examples:", value: `- +roleinfo @Role\n- +roleinfo 1295076771905142811`, inline: false }
                );
            return message.reply({ embeds: [guideEmbed] });
        }

        const roleInput = args[0];
        let role;

        if (/^\d+$/.test(roleInput)) {
            // If the input is a role ID
            role = message.guild.roles.cache.get(roleInput);
        } else if (message.mentions.roles.size > 0) {
            // If it's a role mention
            role = message.mentions.roles.first();
        } else {
            // If it's a role name
            role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
        }

        if (!role) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('Role not found.');
            return message.reply({ embeds: [errorEmbed] });
        }

        // Extract permissions
        const permissions = role.permissions.toArray();
        const importantPermissions = [
            'Administrator', 'ManageChannels', 'ManageRoles', 'ManageGuild', 
            'KickMembers', 'BanMembers', 'MentionEveryone', 'ManageMessages', 
            'ViewAuditLog', 'ManageWebhooks'
        ];

        const filteredPermissions = permissions
            .filter(perm => importantPermissions.includes(perm))
            .map(perm => ` ${perm.replace(/([A-Z])/g, ' $1').trim()}`)
            .join('\n') || ' No important permissions';

        // Role Information
        const roleEmbed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setAuthor({ name: 'Command : Role Info', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`Role Information: **${role.name}**`)
            .addFields(
                { name: " Role ID", value: `\`${role.id}\``, inline: false },
                { name: " Created At", value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: false },
                { name: " Members", value: `${role.members.size} users`, inline: false },
                { name: " Role Permissions", value: filteredPermissions, inline: false }
            );

        return message.reply({ embeds: [roleEmbed] });
    },
};
