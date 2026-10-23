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

const NAMED_COLORS = {
  red: '#FF0000', green: '#00FF00', blue: '#0000FF', yellow: '#FFFF00',
  orange: '#FFA500', purple: '#800080', pink: '#FFC0CB', white: '#FFFFFF',
  black: '#000000', gray: '#808080', grey: '#808080', cyan: '#00FFFF',
  magenta: '#FF00FF', gold: '#FFD700', silver: '#C0C0C0', discord: '#5865F2',
  blurple: '#5865F2', navy: '#000080', teal: '#008080', maroon: '#800000',
  lime: '#00FF00', indigo: '#4B0082', violet: '#EE82EE', coral: '#FF7F50',
  salmon: '#FA8072', khaki: '#F0E68C', beige: '#F5F5DC', brown: '#A52A2A'
};

function parseColor(input) {
  if (!input) return null;
  const lower = input.toLowerCase();
  if (NAMED_COLORS[lower]) return parseInt(NAMED_COLORS[lower].slice(1), 16);
  if (/^#?[0-9A-Fa-f]{6}$/.test(input)) {
    return parseInt(input.replace('#', ''), 16);
  }
  const rgbMatch = input.match(/^(\d{1,3}),(\d{1,3}),(\d{1,3})$/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    if (r <= 255 && g <= 255 && b <= 255)
      return (r << 16) | (g << 8) | b;
  }
  return null;
}

export default {
  name: 'rolecolor',
  aliases: ['rcolor', 'role-color', 'setrolecolor'],
  description: 'Change role color (name, hex, or RGB).',
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
        const colorList = '`red`, `green`, `blue`, `yellow`, `orange`, `purple`, `pink`\n`white`, `black`, `gray`, `cyan`, `magenta`, `gold`, `silver`\n`discord`/`blurple`, `navy`, `teal`, `maroon`, and more!';
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addSectionComponents(new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder()
                .setContent(
                  `# Role Color Help\n\n` +
                  `**Usage:** \`-rolecolor [role] [color]\`\n\n` +
                  `**Color Formats:**\n` +
                  `⤷ Name: \`red\`, \`blue\`, \`green\`, \`purple\`, \`gold\`\n` +
                  `⤷ Hex: \`#FF0000\` or \`FF0000\`\n` +
                  `⤷ RGB: \`255,0,0\`\n\n` +
                  `**Examples:**\n` +
                  `- \`-rolecolor @Member red\`\n` +
                  `- \`-rolecolor Member #FF5733\`\n` +
                  `- \`-rolecolor VIP 255,100,50\`\n\n` +
                  `**Available Colors:**\n${colorList}\n\n` +
                  `**${message.guild.name}**`
                ))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const colorInput = args[args.length - 1];
      const roleArgs = args.slice(0, args.length - 1);

      const role = message.mentions.roles.first() ||
        message.guild.roles.cache.get(roleArgs[0]) ||
        message.guild.roles.cache.find(r => r.name.toLowerCase() === roleArgs.join(' ').toLowerCase());

      if (!role) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Role Not Found\n Could not find the role. Try mentioning it, providing its ID, or its exact name.\n\n**${message.guild.name}**`))],
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

      const colorValue = parseColor(colorInput);
      if (colorValue === null) {
        return safeReply(message, {
          components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(`# Invalid Color\n \`${colorInput}\` is not a valid color.\n\nUse a color name, hex code (#RRGGBB), or RGB format (R,G,B).\n\n**${message.guild.name}**`))],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const hexDisplay = `#${colorValue.toString(16).toUpperCase().padStart(6, '0')}`;
      await role.setColor(colorValue, `Color changed by ${message.author.tag}`);

      return safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(colorValue)
          .addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder()
              .setContent(
                `#  Role Color Updated\n\n` +
                `** Role:** <@&${role.id}> (${role.name})\n` +
                `** New Color:** \`${hexDisplay}\`\n` +
                `**By:** ${message.author}\n\n` +
                `**${message.guild.name}**`
              ))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ dynamic: true }))))],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (err) {
      console.error('[ROLECOLOR]', err);
      safeReply(message, {
        components: [new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(new TextDisplayBuilder()
            .setContent(`# Error\n An error occurred. Please check my permissions.\n\n**${message.guild.name}**`))],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  }
};
