import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js';

async function safeReply(message, opts) {
  try { return await message.reply(opts); } catch (e) { if (e.code !== 10008) throw e; }
}

/**
 * Resolve a role from args — supports: @mention, ID, or name (including multi-word names).
 * roleArgs = all args except the last one (which is the user).
 */
function resolveRole(guild, roleArgs, mentions) {
  // 1. Role mention
  if (mentions.roles.size > 0) return mentions.roles.first();

  const joined = roleArgs.join(' ').trim();
  if (!joined) return null;

  // 2. Role ID
  if (/^\d{17,20}$/.test(roleArgs[0])) {
    const byId = guild.roles.cache.get(roleArgs[0]);
    if (byId) return byId;
  }

  // 3. Exact name (case-insensitive)
  return guild.roles.cache.find(r => r.name.toLowerCase() === joined.toLowerCase()) || null;
}

/**
 * Resolve a member from the last argument — supports: @mention, ID, username, display name.
 * Always attempts an API fetch for mentions/IDs so uncached members are found.
 */
async function resolveMember(message, lastArg) {
  if (!lastArg) return null;

  // 1. Extract raw ID from <@123>, <@!123>, or a bare snowflake
  const idMatch = lastArg.match(/^<@!?(\d{17,20})>$/) ||
                  (lastArg.match(/^\d{17,20}$/) ? [lastArg, lastArg] : null);

  if (idMatch) {
    const id = idMatch[1];
    // Cache hit first, then API fetch (handles uncached / offline members)
    return (
      message.guild.members.cache.get(id) ||
      await message.guild.members.fetch(id).catch(() => null)
    );
  }

  // 2. Fallback: username / display name search in cache
  const lower = lastArg.toLowerCase();
  return (
    message.guild.members.cache.find(m =>
      m.user.username.toLowerCase()      === lower ||
      m.displayName.toLowerCase()        === lower ||
      (m.user.globalName?.toLowerCase()) === lower
    ) || null
  );
}

export default {
  name: 'roleremove',
  aliases: ['rrm', 'role-remove', 'remrole'],
  description: 'Remove a role from a user.',
  async execute(message, args) {
    try {
      // ── Permission check ────────────────────────────────────────────────────
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) &&
          !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return safeReply(message, {
          flags: [MessageFlags.IsComponentsV2],
          components: [new ContainerBuilder().setAccentColor(0xFF4444)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `##   Permission Denied\n> You need \`Manage Roles\` or \`Administrator\` to use this command.\n\n**${message.guild.name}**`
            ))]
        });
      }

      // ── Usage guide ─────────────────────────────────────────────────────────
      if (args.length < 2) {
        return safeReply(message, {
          flags: [MessageFlags.IsComponentsV2],
          components: [new ContainerBuilder().setAccentColor(0x5865F2)
            .addSectionComponents(new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `##   Role Remove — Usage\n\n` +
                `**Syntax:** \`&roleremove [role] [user]\`\n\n` +
                `**Examples:**\n` +
                `> \`&roleremove @Member @User\`\n` +
                `> \`&roleremove 123456789 @User\`\n` +
                `> \`&roleremove VIP 987654321\`\n` +
                `> \`&roleremove free fire @User\`\n\n` +
                `Role and user can each be a **mention**, **ID**, or **name**.\n\n` +
                `**Aliases:** \`rrm\` · \`role-remove\` · \`remrole\``
              ))
              .setThumbnailAccessory(new ThumbnailBuilder()
                .setURL(message.author.displayAvatarURL({ extension: 'png' })))
            )]
        });
      }

      // ── Resolve user (always the last arg) ──────────────────────────────────
      const lastArg  = args[args.length - 1];
      const target   = await resolveMember(message, lastArg);

      if (!target) {
        return safeReply(message, {
          flags: [MessageFlags.IsComponentsV2],
          components: [new ContainerBuilder().setAccentColor(0xFF4444)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `##   User Not Found\n> Could not find a member matching \`${lastArg}\`.\n> Use a **@mention**, **user ID**, or exact **username**.\n\n**${message.guild.name}**`
            ))]
        });
      }

      // ── Resolve role (everything before the last arg) ────────────────────────
      // If the user was mentioned, skip mention tokens; otherwise take all but last.
      const memberMentioned = message.mentions.members.has(target.id);
      const roleArgs = memberMentioned
        ? args.filter(a => !a.includes(target.id))   // remove the mention token(s)
        : args.slice(0, args.length - 1);

      const role = resolveRole(message.guild, roleArgs, message.mentions);

      if (!role) {
        return safeReply(message, {
          flags: [MessageFlags.IsComponentsV2],
          components: [new ContainerBuilder().setAccentColor(0xFF4444)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `##   Role Not Found\n> Could not find a role matching \`${roleArgs.join(' ')}\`.\n> Use a **@role mention**, **role ID**, or exact **role name**.\n\n**${message.guild.name}**`
            ))]
        });
      }

      // ── Bot permission checks ───────────────────────────────────────────────
      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return safeReply(message, {
          flags: [MessageFlags.IsComponentsV2],
          components: [new ContainerBuilder().setAccentColor(0xFF4444)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `##   Bot Missing Permission\n> I need the \`Manage Roles\` permission to do this.\n\n**${message.guild.name}**`
            ))]
        });
      }

      if (role.position >= message.guild.members.me.roles.highest.position) {
        return safeReply(message, {
          flags: [MessageFlags.IsComponentsV2],
          components: [new ContainerBuilder().setAccentColor(0xFF4444)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `##   Role Too High\n> **${role.name}** is at or above my highest role — I cannot manage it.\n\n**${message.guild.name}**`
            ))]
        });
      }

      // ── Check user actually has the role ────────────────────────────────────
      if (!target.roles.cache.has(role.id)) {
        return safeReply(message, {
          flags: [MessageFlags.IsComponentsV2],
          components: [new ContainerBuilder().setAccentColor(0xFF9900)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `##   Role Not Assigned\n> **${target.user.username}** does not have the **${role.name}** role.\n\n**${message.guild.name}**`
            ))]
        });
      }

      // ── Remove the role ─────────────────────────────────────────────────────
      await target.roles.remove(role, `Removed by ${message.author.tag}`);

      return safeReply(message, {
        flags: [MessageFlags.IsComponentsV2],
        components: [new ContainerBuilder().setAccentColor(0x57F287)
          .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `##   Role Removed\n\n` +
              `> ** User:** ${target} · \`${target.id}\`\n` +
              `> ** Role:** <@&${role.id}> · ${role.name}\n` +
              `> ** By:** ${message.author}\n\n` +
              `**${message.guild.name}**`
            ))
            .setThumbnailAccessory(new ThumbnailBuilder()
              .setURL(target.user.displayAvatarURL({ extension: 'png' })))
          )]
      });

    } catch (err) {
      console.error('[ROLEREMOVE]', err);
      safeReply(message, {
        flags: [MessageFlags.IsComponentsV2],
        components: [new ContainerBuilder().setAccentColor(0xFF4444)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `##   Unexpected Error\n> \`${err.message}\`\n> Please check my permissions and try again.\n\n**${message.guild.name}**`
          ))]
      });
    }
  }
};
