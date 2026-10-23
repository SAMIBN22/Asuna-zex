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
  name: 'untimeout',
  aliases: ['removetimeout', 'uto'],
  description: 'Remove a timeout from a member',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply(errorMsg('You do not have permission to use this command.'));
    }

    if (args.length < 1) {
      return message.reply({
        components: [
          new ContainerBuilder().setAccentColor(0x5865F2)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('##  __Remove Timeout Command__'))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              '**Usage:** `-untimeout <user/ID> [reason]`\n' +
              '**Examples:**\n' +
              '`-untimeout @user`\n' +
              '`-untimeout 123456789 Appeal accepted`'
            ))
        ],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const userInput = args[0];
    const reason    = args.slice(1).join(' ') || 'No reason provided';

    let member = await resolveMember(message, args[0]);

    if (!member) return message.reply(errorMsg('Member not found. Please mention them or provide a valid ID.'));

    if (!member.isCommunicationDisabled()) {
      return message.reply(errorMsg(`**${member.user.tag}** does not have an active timeout.`));
    }

    try {
      await member.timeout(null, reason);
    } catch (e) {
      return message.reply(errorMsg('Failed to remove timeout. Check my permissions.'));
    }

    await message.reply({
      components: [
        new ContainerBuilder().setAccentColor(0x57F287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('##  __Timeout Removed__'))
          .addSeparatorComponents(sep())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Member:** ${member.user.tag} (<@${member.id}>)\n` +
            `**Reason:** ${reason}\n` +
            `**Moderator:** ${message.author.tag}`
          ))
      ],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
