import { EmbedBuilder, PermissionsBitField } from 'discord.js'

export default {
  name: 'sent',
  description: 'Send a DM to every member who has the specified role.',
  usage: '-sent @role <message>',
  category: 'Admin',
  aliases: ['-sent'],
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(' You need **Administrator** permission to use this command!')
        ]
      }).catch(() => {});
    }

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    if (!role) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(' Please mention a valid role or provide its ID.')
        ]
      }).catch(() => {});
    }

    if (args.length && (args[0] === role.id || args[0].includes(role.id))) {
      args.shift();
    }
    const content = args.join(' ');
    if (!content) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(' Please provide the message to send.')
        ]
      }).catch(() => {});
    }

    const infoMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FFFFFF')
          .setDescription(`Sending message to ${role.members.size} members with the ${role.name} role…`)
      ]
    });

    let failed = 0;
    const sendPromises = role.members.map(member => member.send({ content }).catch(() => failed++));
    await Promise.all(sendPromises);

    const success = role.members.size - failed;
    await infoMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor('#FFFFFF')
          .setDescription(` Sent message to ${success}/${role.members.size} members.${failed ? `\n ${failed} member(s) had DMs disabled.` : ''}`)
      ]
    });

    // Add new behaviour: if last argument resolves to a text channel, treat this as channel broadcast instead of role DMs
    const potentialChannelId = args[args.length - 1]?.replace(/[^0-9]/g, '');
    const targetChannel = message.guild.channels.cache.get(potentialChannelId);
    if (targetChannel && targetChannel.isTextBased()) {
      // Extract message content (everything except the last arg)
      const msgContent = args.slice(0, -1).join(' ');
      if (!msgContent) {
        return message.reply({ embeds: [ new EmbedBuilder().setColor('#FFFFFF').setDescription(' Please provide the message to send.') ] });
      }
      await targetChannel.send({ content: msgContent });
      return message.reply({ embeds: [ new EmbedBuilder().setColor('#FFFFFF').setDescription(` Message sent to ${targetChannel}`) ] });
    }
  },
}; 