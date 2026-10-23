import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionsBitField
} from 'discord.js'

const timeUnits = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

function parseTime(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const ms = parseInt(match[1]) * timeUnits[match[2].toLowerCase()];
  if (ms < 5000 || ms > 28 * 86400000) return null;
  return ms;
}

function formatDuration(ms) {
  const parts = [];
  const d = Math.floor(ms / 86400000); if (d) parts.push(`${d}d`);
  const h = Math.floor((ms % 86400000) / 3600000); if (h) parts.push(`${h}h`);
  const m = Math.floor((ms % 3600000) / 60000); if (m) parts.push(`${m}m`);
  const s = Math.floor((ms % 60000) / 1000); if (s) parts.push(`${s}s`);
  return parts.join(' ');
}

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

function errorMsg(text) {
  return {
    components: [
      new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(` ${text}`))
    ],
    flags: MessageFlags.IsComponentsV2
  };
}

export default {
  name: 'timeout',
  aliases: ['timeoutuser', 'to'],
  description: 'Apply a timeout to a member for a specific duration',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply(errorMsg('You do not have permission to use this command.'));
    }

    if (args.length < 2) {
      return message.reply({
        components: [
          new ContainerBuilder().setAccentColor(0x5865F2)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('##  __Timeout Command__'))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              '**Usage:** `-timeout <user/ID> <duration> [reason]`\n' +
              '**Examples:**\n' +
              '`-timeout @user 10m`\n' +
              '`-timeout 123456789 2h Spamming`\n' +
              '`-timeout @user 1d Breaking rules`\n\n' +
              '**Duration formats:** `s` seconds · `m` minutes · `h` hours · `d` days\n' +
              '-# Maximum timeout duration is **28 days**'
            ))
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const userInput = args[0];
    const durStr    = args[1];
    const reason    = args.slice(2).join(' ') || 'No reason provided';

    let member = await resolveMember(message, args[0]);

    if (!member) return message.reply(errorMsg('Member not found. Please mention them or provide a valid ID.'));
    if (member.id === message.author.id) return message.reply(errorMsg('You cannot timeout yourself.'));
    if (!member.moderatable) return message.reply(errorMsg('I cannot timeout this member. They may have a higher role than me.'));

    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply(errorMsg('Cannot timeout an Administrator.'));
    }

    const ms = parseTime(durStr);
    if (!ms) {
      return message.reply(errorMsg('Invalid duration. Use formats like `10s`, `5m`, `2h`, `1d`. Max is **28d**.'));
    }

    try {
      await member.timeout(ms, reason);
    } catch (e) {
      return message.reply(errorMsg('Failed to apply timeout. Check my permissions.'));
    }

    const endsAt = Math.floor((Date.now() + ms) / 1000);

    await message.reply({
      components: [
        new ContainerBuilder().setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('##  __Timeout Applied__'))
          .addSeparatorComponents(sep())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Member:** ${member.user.tag} (<@${member.id}>)\n` +
            `**Duration:** ${formatDuration(ms)}\n` +
            `**Expires:** <t:${endsAt}:R> — <t:${endsAt}:F>\n` +
            `**Reason:** ${reason}\n` +
            `**Moderator:** ${message.author.tag}`
          ))
      ],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
