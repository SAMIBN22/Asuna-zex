import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js'

async function safeReply(message, opts) {
  try { return await message.reply(opts); } catch (e) { if (e.code !== 10008) throw e; }
}

export default {
  name: 'rolename',
  aliases: ['rname', 'role-name', 'renamerole', 'roleename'],
  description: 'Change role name.',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) &&
          !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Permission Denied\n You need \`Manage Roles\` or \`Administrator\` to use this command.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (args.length < 2) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addSectionComponents(new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder()
                .setContent(
                  `# Role Name Help\n\n` +
                  `**Usage:** \`-rolename [role] [new name]\`\n\n` +
                  `**Examples:**\n` +
                  `- \`-rolename @Member VIP Member\`\n` +
                  `- \`-rolename Member Premium User\`\n` +
                  `- \`-rolename 123456789 New Name\`\n\n` +
                  `Changes the display name of a role.\n\n` +
                  `**Aliases:** rolename, rname, role-name, renamerole\n\n` +
                  `**${message.guild.name}**`
                ))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const mentionedRole = message.mentions.roles.first();
      let role;
      let newName;

      if (mentionedRole) {
        role = mentionedRole;
        newName = args.filter(a => !a.match(/<@&\d+>/)).join(' ').trim();
      } else if (/^\d+$/.test(args[0])) {
        role = message.guild.roles.cache.get(args[0]);
        newName = args.slice(1).join(' ').trim();
      } else {
        const existing = message.guild.roles.cache.find(r => r.name.toLowerCase() === args[0].toLowerCase());
        if (existing) {
          role = existing;
          newName = args.slice(1).join(' ').trim();
        } else {
          const allButLast = args.slice(0, -1);
          const foundByName = message.guild.roles.cache.find(r => r.name.toLowerCase() === allButLast.join(' ').toLowerCase());
          if (foundByName) {
            role = foundByName;
            newName = args[args.length - 1];
          }
        }
      }

      if (!role) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Role Not Found\n Could not find the role. Try mentioning it, providing its ID, or its exact name.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (!newName || newName.length === 0) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Missing New Name\n Please provide a new name for the role.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (newName.length > 100) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Name Too Long\n Role names cannot exceed **100 characters**.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (role.position >= message.guild.members.me.roles.highest.position) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Role Too High\n I cannot modify a role higher than or equal to my highest role.\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const oldName = role.name;
      await role.setName(newName, `Name changed by ${message.author.tag}`);

      return safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(
                `#  Role Name Updated\n\n` +
                `** Role:** <@&${role.id}>\n` +
                `** Old Name:** ${oldName}\n` +
                `** New Name:** ${newName}\n` +
                `**By:** ${message.author}\n\n` +
                `**${message.guild.name}**`
              ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (err) {
      console.error('[ROLENAME]', err);
      safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`# Error\n An error occurred. Please check my permissions.\n\n**${message.guild.name}**`))],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};
