import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { EmbedBuilder, PermissionsBitField } from 'discord.js'
// Comprehensive security system temporarily disabled

export default {
  name: "removerole",
  description: "Remove a role from a user.",
  async execute(message, args) {
    // Ensure the user has the required permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('You need "Manage Roles" permission to use this command.')
            .setColor('#FFFFFF'),
        ],
      });
    }

    // Ensure the bot has the required permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('I need "Manage Roles" permission to remove roles.')
            .setColor('#FFFFFF'),
        ],
      });
    }

    // Get the target user
    const target = await resolveMember(message, args[0]);
    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("Please mention a valid user or provide their user ID.")
            .setColor('#FFFFFF'),
        ],
      });
    }

    // Get the role (support mention, ID, or name)
    const roleArg = args[1];
    const role =
      message.mentions.roles.first() || // Role mention (@role)
      message.guild.roles.cache.get(roleArg) || // Role ID
      message.guild.roles.cache.find((r) => r.name.toLowerCase() === roleArg?.toLowerCase()); // Role name

    if (!role) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("  No role found. Please mention the role, provide its ID, or type its exact name.")
            .setColor('#FFFFFF'),
        ],
      });
    }

    // Ensure the role is assignable
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("  I cannot remove a role that is higher or equal to my highest role.")
            .setColor('#FFFFFF'),
        ],
      });
    }

    // Check if the user has the role
    if (!target.roles.cache.has(role.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(` ${target.user.tag} does not have the role **${role.name}**.`)
            .setColor('#FFFFFF'),
        ],
      });
    }

    // Remove the role
    try {
      // Check comprehensive security system - TEMPORARILY DISABLED
      /*
      const securityCheck = await checkComprehensiveSecurity({
        guild: message.guild,
        executor: message.author,
        target: target.user,
        action: 'remove-role',
        reason: `Removing role ${role.name} from ${target.user.tag}`
      });
      
      if (securityCheck.blocked) {
        // Execute security action against the violator
        const securityResult = await executeSecurityAction({
          guild: message.guild,
          violator: message.author,
          target: target.user,
          attemptedAction: 'remove-role',
          reason: `Removing role ${role.name} from ${target.user.tag}`,
          primaryAction: securityCheck.primaryAction,
          enabledProtections: securityCheck.enabledProtections
        });
        
        // Send security violation response
        const responseEmbed = createSecurityResponseEmbed({
          guild: message.guild,
          target: target.user,
          attemptedAction: 'role removal',
          actionTaken: securityResult.actionTaken,
          protectionNames: securityCheck.protectionNames,
          hasWhitelistCheck: securityCheck.hasWhitelistCheck
        });
        
        return message.reply({ embeds: [responseEmbed] });
      }
      */
      
      // Proceed with role removal
      await target.roles.remove(role);
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("  An error occurred while removing the role.")
            .setColor('#FFFFFF'),
        ],
      });
    }

    // Send a success message with extra details
    const successEmbed = new EmbedBuilder()
      .setDescription(`  Successfully removed the role **${role.name}** from ${target.user.tag}.`)
      .setColor('#FFFFFF')
      .addFields(
        { name: ' User Mention:', value: `${target}`, inline: true },
        { name: ' User Tag:', value: `${target.user.tag}`, inline: true },
        { name: '🆔 User ID:', value: `${target.id}`, inline: true },
        { name: ' Role Name:', value: `${role.name}`, inline: true },
        { name: ' Role Mention:', value: `<@&${role.id}>`, inline: true },
        { name: '🆔 Role ID:', value: `${role.id}`, inline: true }
      );

    await message.reply({ embeds: [successEmbed] });
  },
};
