import {
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MessageFlags
} from 'discord.js';

import GuildSetup from "../../../models/clanGuildSetup.js"; 
import ClanConfig from "../../../models/clanConfig.js";
import config from "../../../config/clanConfig.js"; 

export default {
    name: 'delete-calan',
    aliases: ['delete', 'deleteclan', 'delete-clan'],
  category: 'Clan',
    description: 'Delete a clan by ID, Name, or Owner',
    cooldown: 3,
    async execute(message, args, client) {
        const { member, guild } = message;
        const theme = client.clanThemes?.emojis?.main || {};
        const images = client.clanThemes?.images?.main || {};

        const userThumbnail = new ThumbnailBuilder()
            .setURL(member.user.displayAvatarURL({ extension: "png", size: 512 }))
            .setDescription(`${member.user.username}'s Avatar`);

        const buildContainer = (header, content) => {
            return new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`# __${header}__\n\n${content}`)
                        )
                        .setThumbnailAccessory(userThumbnail)
                );
        };

        const replyWithContainer = (header, content) => {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [buildContainer(header, content)],
                allowedMentions: { repliedUser: false }
            });
        };

        const guildSetup = await GuildSetup.findOne({ guildId: guild.id });
        if (!guildSetup) {
            return replyWithContainer(`${theme.clouds} Clan System`, `> ${theme.dot} *Server is not setup yet*\n> ${theme.dot} *Please run \`${config.prefix}setup\` first*`);
        }

        const managerRoleId = guildSetup.roles?.manager;
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
        const isManager = managerRoleId && member.roles.cache.has(managerRoleId);
        if (!isAdmin && !isManager) {
            return replyWithContainer(`${theme.clouds} Permissions`, `> ${theme.dot} *You don't have permissions to use this command*\n> ${theme.dot} *Only managers and admins can delete clans*`);
        }

        if (!args[0]) {
            return replyWithContainer(`${theme.clouds} Delete Clan`, `> ${theme.dot} *Please provide a clan identifier*\n> ${theme.dot} *Usage: \`${config.prefix}delete <clanName|clanID|owner>\`*`);
        }

        const identifier = args.join(' ');
        let clan = await ClanConfig.findOne({ guildId: guild.id, name: identifier });
        
        if (!clan) {
            clan = await ClanConfig.findOne({ guildId: guild.id, clanId: identifier });
        }
        
        if (!clan) {
            let ownerMember;
            const mentionMatch = identifier.match(/^<@!?(\d+)>$/);
            if (mentionMatch) {
                ownerMember = guild.members.cache.get(mentionMatch[1]);
            } else {
                ownerMember = guild.members.cache.get(identifier) || await guild.members.fetch(identifier).catch(() => null);
            }
            
            if (ownerMember) {
                clan = await ClanConfig.findOne({ guildId: guild.id, leaders: ownerMember.id });
            }
        }

        if (!clan) {
            return replyWithContainer(`${theme.clouds} Delete Clan`, `> ${theme.no} *Clan not found*\n> ${theme.dot} *Please check the clan name, ID, or owner*`);
        }

        const role = guild.roles.cache.get(clan.roleId);
        if (role) await role.delete();

        const textChannel = guild.channels.cache.get(clan.channels?.text);
        if (textChannel) await textChannel.delete();

        const voiceChannel = guild.channels.cache.get(clan.channels?.voice);
        if (voiceChannel) await voiceChannel.delete();

        await ClanConfig.deleteOne({ _id: clan._id });

        const bannerImage = new MediaGalleryBuilder().addItems([
            {
                media: { url: images.banner },
                title: `${theme.dot} Clan Deleted Successfully`,
                subtitle: `${clan.name} has been removed`
            }
        ]);

        const container = new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# __${theme.title} Clan Deleted__`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addMediaGalleryComponents(bannerImage)
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${theme.star} **__Deletion Summary__**\n` +
                            `> ${theme.arrow} **Clan Name:** ${clan.name}\n` +
                            `> ${theme.arrow} **Role:** Deleted\n` +
                            `> ${theme.arrow} **Channels:** Deleted\n` +
                            `> ${theme.arrow} **Database:** Cleared\n` +
                            `> ${theme.arrow} **Status:** Complete`
                        )
                    )
                    .setThumbnailAccessory(userThumbnail)
            );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { repliedUser: false }
        });
    }
};