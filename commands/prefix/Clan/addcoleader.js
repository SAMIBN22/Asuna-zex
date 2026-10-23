import { resolveMember } from '../../../lib/resolveUser.js';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
} from "discord.js";

import ClanConfig    from "../../../models/clanConfig.js";
import GuildSetup    from "../../../models/clanGuildSetup.js";
import config        from "../../../config/clanConfig.js";

export default {
  name: "addcoleader",
  category: 'Clan',
  aliases: ["addcol"],
  description: "Add a co-leader to your clan and assign the configured co-leader role (Leaders only)",
  cooldown: 5,

  async execute(message, args, client) {
    const { member, guild } = message;
    const theme  = client.clanThemes?.emojis?.main  || {};

    // ── Helpers ──────────────────────────────────────────────────────────────
    const thumbnail = new ThumbnailBuilder()
      .setURL(member.user.displayAvatarURL({ extension: "png", size: 512 }))
      .setDescription(`${member.user.username}'s Avatar`);

    const reply = (header, content) =>
      message.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
        components: [
          new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addSectionComponents(
              new SectionBuilder()
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`# __${header}__\n\n${content}`)
                )
                .setThumbnailAccessory(thumbnail)
            )
        ],
      });

    // ── Guild setup check ────────────────────────────────────────────────────
    const guildConfig = await GuildSetup.findOne({ guildId: guild.id });
    if (!guildConfig) {
      return reply(
        `${theme.clouds || ''} Clan System`,
        `> ${theme.dot || '•'} *The clan system has not been configured yet.*\n` +
        `> ${theme.dot || '•'} *Please set it up before using this command.*`
      );
    }

    // ── Co-leader role check ─────────────────────────────────────────────────
    const coLeaderRoleId = guildConfig.roles?.coLeader;
    const coLeaderRole   = coLeaderRoleId ? guild.roles.cache.get(coLeaderRoleId) : null;
    if (!coLeaderRole) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.no || ''} *The co-leader role has not been configured.*\n` +
        `> ${theme.dot || '•'} *Please ask an admin to set it up first.*`
      );
    }

    // ── Caller must be a clan leader ─────────────────────────────────────────
    const clan = await ClanConfig.findOne({ guildId: guild.id, leaders: member.id });
    if (!clan) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.dot || '•'} *You must be a clan leader to add co-leaders.*\n` +
        `> ${theme.dot || '•'} *Only leaders can manage co-leaders.*`
      );
    }

    // ── Usage check ──────────────────────────────────────────────────────────
    if (!args[0]) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.dot || '•'} *Please mention or name the member to promote.*\n` +
        `> ${theme.dot || '•'} *Usage: \`${config.prefix}addcoleader <@user | username | ID>\`*`
      );
    }

    // ── Resolve target member (mention, username, display name, or ID) ───────
    const targetMember = await resolveMember(message, args[0]);
    if (!targetMember) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.no || ''} *Could not find that member.*\n` +
        `> ${theme.dot || '•'} *Try mentioning them directly with @.*`
      );
    }

    // ── Validation ───────────────────────────────────────────────────────────
    if (targetMember.id === member.id) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.info || ''} *You cannot add yourself as a co-leader.*`
      );
    }

    if (clan.leaders.includes(targetMember.id)) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.info || ''} *${targetMember.user.username} is already a leader.*\n` +
        `> ${theme.dot || '•'} *Leaders cannot be co-leaders at the same time.*`
      );
    }

    if (clan.coLeaders.includes(targetMember.id)) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.info || ''} *${targetMember.user.username} is already a co-leader.*\n` +
        `> ${theme.dot || '•'} *They are already part of the leadership.*`
      );
    }

    if (!clan.members.includes(targetMember.id)) {
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.info || ''} *${targetMember.user.username} is not a member of your clan.*\n` +
        `> ${theme.dot || '•'} *Add them to the clan first, then promote them.*`
      );
    }

    // ── Promote: update DB ────────────────────────────────────────────────────
    clan.coLeaders.push(targetMember.id);
    clan.members = clan.members.filter(id => id !== targetMember.id);
    await clan.save();

    // ── Assign the pre-configured co-leader role ──────────────────────────────
    try {
      await targetMember.roles.add(coLeaderRole);
    } catch (err) {
      console.error(`[addcoleader] Failed to assign role to ${targetMember.id}:`, err.message);
      return reply(
        `${theme.clouds || ''} Add Co-Leader`,
        `> ${theme.info || ''} *${targetMember.user.username} was saved as co-leader in the database,*\n` +
        `> ${theme.dot || '•'} *but I could not assign the role — check my role hierarchy.*`
      );
    }

    return reply(
      `${theme.clouds || ''} Add Co-Leader`,
      `> ${theme.yes || ''} *${targetMember.user.username} has been promoted to co-leader.*\n` +
      `> ${theme.dot || '•'} *The <@&${coLeaderRole.id}> role has been assigned automatically.*`
    );
  },
};
