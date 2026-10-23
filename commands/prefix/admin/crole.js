import { EmbedBuilder, PermissionsBitField } from 'discord.js'
// Comprehensive security system temporarily disabled

const COOLDOWN_TIME = 5000; // 5 seconds cooldown
const cooldowns = new Map();

export default {
    name: 'crole',
    description: 'Create a new role in the server.',
    aliases: ['newrole', 'rolecreate'],
    async execute(message, args) {
        // Check if the user is on cooldown
        if (cooldowns.has(message.author.id)) {
            return message.react(''); // React with a cooldown emoji
        }

        // Set cooldown for the user
        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        // Check if the user has Manage Roles permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription("You need the `Manage Roles` permission to use this command.")],
            });
        }

        // Check if a role name is provided
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Command : crole', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription("Create a new role in the server.")
                .addFields(
                    { name: "Aliases:", value: "- newrole, rolecreate", inline: false },
                    { name: "Usage:", value: "- +crole <roleName>", inline: false },
                    { name: "Examples:", value: "- +crole <rolename>\n- +crole Celestial", inline: false }
                );

            return message.reply({ embeds: [embed] });
        }

        const roleName = args.join(' '); // Combine all arguments to form the role name

        try {
            // Check comprehensive security system - TEMPORARILY DISABLED
            /*
            const securityCheck = await checkComprehensiveSecurity({
                guild: message.guild,
                executor: message.author,
                target: null, // No specific target for role creation
                action: 'create-role',
                reason: `Creating role: ${roleName}`
            });
            
            if (securityCheck.blocked) {
                // Execute security action against the violator
                const securityResult = await executeSecurityAction({
                    guild: message.guild,
                    violator: message.author,
                    target: null,
                    attemptedAction: 'create-role',
                    reason: `Creating role: ${roleName}`,
                    primaryAction: securityCheck.primaryAction,
                    enabledProtections: securityCheck.enabledProtections
                });
                
                // Send security violation response
                const responseEmbed = createSecurityResponseEmbed({
                    guild: message.guild,
                    target: { name: roleName },
                    attemptedAction: 'role creation',
                    actionTaken: securityResult.actionTaken,
                    protectionNames: securityCheck.protectionNames,
                    hasWhitelistCheck: securityCheck.hasWhitelistCheck
                });
                
                return message.reply({ embeds: [responseEmbed] });
            }
            */
            
            // Create the role with the specified name
            const role = await message.guild.roles.create({
                name: roleName,
                reason: `Role created by ${message.author.tag}`,
            });

            // Success embed
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription(`Successfully created role **${role.name}**.`);

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            let errorMessage = "Failed to create the role.";
            if (error.code === 50013) {
                errorMessage += " The bot needs `Manage Roles` permission.";
            }

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setDescription(errorMessage)],
            });
        }
    }
};
