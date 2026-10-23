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
  name: "removecoleader",
  category: 'Clan',
  aliases: ["remcol", "removecol"],
  description: "Remove a co-leader from your clan and strip the co-leader role (Leaders only)",
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

    // ── Co-leader role ───────────────────────────────────────────────────────
    const coLeaderRoleId = guildConfig.roles?.coLeader;
    const coLeaderRole   = coLeaderRoleId ? guild.roles.cache.get(coLeaderRoleId) : null;

    // ── Caller must be a clan leader ─────────────────────────────────────────
    const clan = await ClanConfig.findOne({ guildId: guild.id, leaders: member.id });
    if (!clan) {
      return reply(
        `${theme.clouds || ''} Remove Co-Leader`,
        `> ${theme.dot || '•'} *You must be a clan leader to remove co-leaders.*\n` +
        `> ${theme.dot || '•'} *Only leaders can manage co-leaders.*`
      );
    }

    // ── Usage check ──────────────────────────────────────────────────────────
    if (!args[0]) {
      return reply(
        `${theme.clouds || ''} Remove Co-Leader`,
        `> ${theme.dot || '•'} *Please mention or name the co-leader to demote.*\n` +
        `> ${theme.dot || '•'} *Usage: \`${config.prefix}removecoleader <@user | username | ID>\`*`
      );
    }

    // ── Resolve target member (mention, username, display name, or ID) ───────
    const targetMember = await resolveMember(message, args[0]);
    if (!targetMember) {
      return reply(
        `${theme.clouds || ''} Remove Co-Leader`,
        `> ${theme.no || ''} *Could not find that member.*\n` +
        `> ${theme.dot || '•'} *Try mentioning them directly with @.*`
      );
    }

    // ── Validation ───────────────────────────────────────────────────────────
    if (!clan.coLeaders.includes(targetMember.id)) {
      return reply(
        `${theme.clouds || ''} Remove Co-Leader`,
        `> ${theme.info || ''} *${targetMember.user.username} is not a co-leader in your clan.*\n` +
        `> ${theme.dot || '•'} *They are not part of the leadership.*`
      );
    }

    // ── Demote: update DB ─────────────────────────────────────────────────────
    clan.coLeaders = clan.coLeaders.filter(id => id !== targetMember.id);
    clan.members.push(targetMember.id);
    await clan.save();

    // ── Remove the pre-configured co-leader role ──────────────────────────────
    if (coLeaderRole) {
      try {
        await targetMember.roles.remove(coLeaderRole);
      } catch (err) {
        console.error(`[removecoleader] Failed to remove role from ${targetMember.id}:`, err.message);
        return reply(
          `${theme.clouds || ''} Remove Co-Leader`,
          `> ${theme.info || ''} *${targetMember.user.username} was demoted in the database,*\n` +
          `> ${theme.dot || '•'} *but I could not remove the role — check my role hierarchy.*`
        );
      }
    }

    return reply(
      `${theme.clouds || ''} Remove Co-Leader`,
      `> ${theme.yes || ''} *${targetMember.user.username} has been removed from co-leaders.*\n` +
      `> ${theme.dot || '•'} *They are now a regular clan member.*`
    );
  },
};
