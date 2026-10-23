import { PermissionFlagsBits } from 'discord.js'

export default {
    name: 'massrole',
    aliases: ['giveroleall', 'roleall'],
    description: 'Give a role to all members in the server (Admin only)',
    cooldown: 10,
    
    async execute(message, args) {
        // Check if user has admin permissions
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.channel.send(' You need Administrator permissions to use this command!');
        }

        // Get the role from mention, ID, or name
        let role = null;
        
        // Try mention first
        if (message.mentions.roles.first()) {
            role = message.mentions.roles.first();
        }
        // Try ID
        else if (args[0] && /^\d+$/.test(args[0])) {
            role = message.guild.roles.cache.get(args[0]);
        }
        // Try name (join all args for multi-word role names)
        else if (args.length > 0) {
            const roleName = args.join(' ');
            role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        }

        if (!role) {
            return message.channel.send(' Please specify a valid role! Use: `-massrole @role` or `-massrole "Role Name"` or `-massrole role_id`');
        }

        // Check if bot can manage the role
        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.channel.send(' I cannot give this role because it\'s higher than or equal to my highest role!');
        }

        try {
            await message.channel.send(` Starting to give ${role.name} to all members... This may take a while.`);

            let successCount = 0;
            let failCount = 0;
            
            // Fetch members with better error handling
            let members;
            try {
                members = await message.guild.members.fetch();
            } catch (fetchError) {
                console.error('Failed to fetch members:', fetchError);
                return message.channel.send(' Failed to fetch server members. Please check bot permissions!');
            }

            for (const [memberId, member] of members) {
                try {
                    if (!member || !member.user) continue;
                    if (member.roles.cache.has(role.id)) continue;
                    if (member.user.bot) continue;

                    await member.roles.add(role.id);
                    successCount++;

                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                    failCount++;
                    if (error.message.includes('Missing Permissions')) {
                        console.error(`[massrole] Missing permissions for member ${memberId}`);
                    }
                }
            }

            const embed = {
                color: 0x00FF00,
                title: ' Mass Role Distribution Complete',
                description: `Successfully distributed role **${role.name}** to server members!`,
                fields: [
                    { name: ' Successful', value: `${successCount} members`, inline: true },
                    { name: ' Failed', value: `${failCount} members`, inline: true },
                    { name: ' Total Members', value: `${members.size} members`, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: `Requested by ${message.author.tag}`
                }
            };

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Mass role error:', error);
            console.error('Error stack:', error.stack);
            
            // Send specific error message
            let errorMessage = ' An error occurred while giving roles to members!';
            
            if (error.message.includes('Missing Permissions')) {
                errorMessage = ' Bot is missing permissions to manage roles!';
            } else if (error.message.includes('Missing Access')) {
                errorMessage = ' Bot does not have access to manage roles!';
            } else if (error.message.includes('rate limit')) {
                errorMessage = ' Rate limit exceeded. Please try again later!';
            }
            
            return message.channel.send(errorMessage);
        }
    }
};
