import { resolveMember } from '../../../lib/resolveUser.js';
import {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits
} from 'discord.js';

export default {
    name: "addrole",
    aliases: ["giverole", "role"],
    description: "Add or remove a role from a user.",
    category: "Admin",
    usage: "+addrole <user> <role>",

    async execute(message, args, client) {
        const guildId = message.guild.id;
        const theme = await client.themeManager.getTheme(guildId);
        const emojis = theme.emojis;
        const themeColor = client.themeManager.getRGBColor(theme.color);

        // Permission check (user)
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Missing Permissions__\n\n` +
                                `> ${emojis.star || ''} **__You need the Administrator permission__**\n` +
                                `> ${emojis.star || ''} **__to use this command correctly.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // Permission check (bot)
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Bot Permissions__\n\n` +
                                `> ${emojis.star || ''} **__I need the Manage Roles permission__**\n` +
                                `> ${emojis.star || ''} **__to perform this action in this server.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!args[0]) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __How To Use__\n\n` +
                                `> ${emojis.star || ''} **__Self:__** \`${client.config.prefix}addrole <@role>\`\n` +
                                `> ${emojis.star || ''} **__Other:__** \`${client.config.prefix}addrole <@user> <@role>\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // Detect whether first argument is a user mention/ID or a role
        const firstArgIsUser = /^<@!?\d+>$/.test(args[0]) || (/^\d{17,20}$/.test(args[0]) && args[1]);
        let targetMember;
        let roleArgStart;

        if (firstArgIsUser) {
            targetMember = await resolveMember(message, args[0]);
            if (!targetMember) {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __Member Not Found__\n\n` +
                                    `> ${emojis.star || ''} **__Could not find that member.__**\n` +
                                    `> ${emojis.star || ''} **__They may not be in this server.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
            roleArgStart = 1;
        } else {
            // No user specified — target is the command author
            targetMember = message.member;
            roleArgStart = 0;
        }

        if (targetMember.id === client.user.id) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Target Error__\n\n` +
                                `> ${emojis.star || ''} **__You cannot manage my__**\n` +
                                `> ${emojis.star || ''} **__roles with this command.__**`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const roleInput = args.slice(roleArgStart).join(' ');
        let targetRole;
        const roleIdCheck = args[roleArgStart]?.replace(/[<@&>]/g, '');

        if (message.mentions.roles.size > 0) {
            targetRole = message.mentions.roles.first();
        } else if (/^\d+$/.test(roleIdCheck) && message.guild.roles.cache.has(roleIdCheck)) {
            targetRole = message.guild.roles.cache.get(roleIdCheck);
        } else {
            targetRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
        }

        const validateRoleHierarchy = (role, botMember, authorMember) => {
            if (role.position >= botMember.roles.highest.position) {
                return `**__I cannot assign this role as it__**\n> ${emojis.star || ''} **__is higher or equal to my highest role.__**`;
            }
            if (role.position >= authorMember.roles.highest.position && authorMember.id !== authorMember.guild.ownerId) {
                return `**__You cannot assign this role as it__**\n> ${emojis.star || ''} **__is higher or equal to your highest role.__**`;
            }
            if (role.managed) {
                return `**__I cannot assign or remove managed__**\n> ${emojis.star || ''} **__roles (e.g. integration or bot roles).__**`;
            }
            return null;
        };

        const performRoleUpdate = async (userMember, roleToUpdate, isInteraction = false, interactionContext = null) => {
            const hasRole = userMember.roles.cache.has(roleToUpdate.id);
            const actionText = hasRole ? 'Removed' : 'Added';

            try {
                if (hasRole) {
                    await userMember.roles.remove(roleToUpdate);
                } else {
                    await userMember.roles.add(roleToUpdate);
                }

                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## ${emojis.yes || ''} __Role ${actionText}__\n\n` +
                                    `> ${emojis.star || ''} **__Successfully ${actionText.toLowerCase()} <@&${roleToUpdate.id}>__**\n` +
                                    `> ${emojis.star || ''} **__Target: <@${userMember.id}>__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(userMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );

                if (isInteraction) {
                    return interactionContext.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                } else {
                    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }
            } catch (error) {
                console.error('[AddRole Command Error]:', error);
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __Action Failed__\n\n` +
                                    `> ${emojis.star || ''} **__Failed to update role:__**\n` +
                                    `> ${emojis.star || ''} **__${error.message}__**`
                                )
                            )
                    );
                if (isInteraction) {
                    return interactionContext.update({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                } else {
                    return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                }
            }
        };

        if (!targetRole) {
            const partialMatches = message.guild.roles.cache.filter(role => role.name.toLowerCase().includes(roleInput.toLowerCase()));

            if (partialMatches.size === 1) {
                targetRole = partialMatches.first();
            } else if (partialMatches.size > 1) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('role_select')
                    .setPlaceholder('Select a role from the list...')
                    .addOptions(
                        Array.from(partialMatches.values()).slice(0, 25).map(role =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(role.name)
                                .setDescription(`Role ID: ${role.id}`)
                                .setValue(role.id)
                        )
                    );

                const selectRow = new ActionRowBuilder().addComponents(selectMenu);

                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.title || ''} __Role Selection__\n\n` +
                                    `> ${emojis.star || ''} **__Multiple roles found for \`${roleInput}\`__**\n` +
                                    `> ${emojis.star || ''} **__Please select the correct role below.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    )
                    .addActionRowComponents(selectRow);

                const sentMessage = await message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

                const collector = sentMessage.createMessageComponentCollector({
                    time: 60000,
                    filter: i => i.user.id === message.author.id && i.customId === 'role_select'
                });

                collector.on('collect', async (interaction) => {
                    const selectedRoleId = interaction.values[0];
                    const selectedRole = message.guild.roles.cache.get(selectedRoleId);

                    if (!selectedRole) {
                        const errContainer = new ContainerBuilder()
                            .setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `# ${emojis.info || ''} __Role Not Found__\n\n` +
                                            `> ${emojis.star || ''} **__That role no longer exists.__**`
                                        )
                                    )
                            );
                        await interaction.update({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
                        return collector.stop();
                    }

                    const hierarchyError = validateRoleHierarchy(selectedRole, message.guild.members.me, message.member);
                    if (hierarchyError) {
                        const errContainer = new ContainerBuilder()
                            .setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                                            `> ${emojis.star || ''} ${hierarchyError}`
                                        )
                                    )
                            );
                        await interaction.update({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
                        return collector.stop();
                    }

                    await performRoleUpdate(targetMember, selectedRole, true, interaction);
                    collector.stop();
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        const errContainer = new ContainerBuilder()
                            .setAccentColor(themeColor)
                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            `# ${emojis.info || ''} __Selection Expired__\n\n` +
                                            `> ${emojis.star || ''} **__Role selection has timed out.__**\n` +
                                            `> ${emojis.star || ''} **__Please run the command again.__**`
                                        )
                                    )
                            );
                        await sentMessage.edit({ components: [errContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                    }
                });

                return;
            } else {
                const container = new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# ${emojis.info || ''} __Role Not Found__\n\n` +
                                    `> ${emojis.star || ''} **__Could not find any role__**\n` +
                                    `> ${emojis.star || ''} **__matching \`${roleInput}\`.__**`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ extension: 'png', size: 512 }))
                            )
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }

        const hierarchyError = validateRoleHierarchy(targetRole, message.guild.members.me, message.member);
        if (hierarchyError) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ${emojis.info || ''} __Hierarchy Error__\n\n` +
                                `> ${emojis.star || ''} ${hierarchyError}`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }))
                        )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        await performRoleUpdate(targetMember, targetRole);
    }
};
