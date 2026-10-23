import {
    ContainerBuilder,
    TextDisplayBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    PermissionsBitField,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ComponentType,
    ChannelType,
    SectionBuilder,
    ThumbnailBuilder
} from 'discord.js';

import GuildSetup from '../../../models/guildSetup.js';
import config from '../../../config/config.js';

export default {
    name: "pcreate",
    description: "Create role & voice channel with owner permissions in the setup category",
    category: "Premium",
    aliases: ["pc", "createpremium"],

    async execute(message, args, client) {

        const theme = await client.themeManager.getTheme(message.guild.id);
        const themeColor = client.themeManager.getRGBColor(theme.color);

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Access Denied__\n` +
                        `> ${theme.emojis.star || ''} __You don't have permission to use this command.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const guildData = await client.getSettings(message.guild.id);
        if (!guildData?.premiumCategory || !message.guild.channels.cache.has(guildData.premiumCategory)) {
            const container = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.title || ''} __Setup Missing__\n` +
                        `> ${theme.emojis.star || ''} __The system category does not exist.__\n` +
                        `> ${theme.emojis.star || ''} __Please set it up with \`${client.config.prefix}psetcategory <#category>\` first.__`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const container = new ContainerBuilder()
            .setAccentColor(themeColor)
            .addTextDisplayComponents(text => text.setContent(
                `## ${theme.emojis.title || ''} __Select Creation Type__`
            ))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addActionRowComponents(row =>
                row.setComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("pcreate_select")
                        .setPlaceholder("Choose what to create")
                        .addOptions([
                            { label: "Role + Channel", value: "role_channel" },
                            { label: "Channel Only", value: "channel_only" },
                            { label: "Role Only", value: "role_only" }
                        ])
                )
            )
            .addSectionComponents(section =>
                section.addTextDisplayComponents(text => text.setContent(
                    `> ${theme.emojis.star || ''} __Click support button below if you need help.__`
                ))
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setLabel("Support")
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.supportServer)
                    )
            );

        const sentMsg = await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = sentMsg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === message.author.id,
            time: 5 * 60 * 1000
        });

        collector.on("collect", async interaction => {
            const choice = interaction.values[0];
            const modal = new ModalBuilder()
                .setCustomId(`pcreate_modal_${interaction.id}_${choice}`)
                .setTitle("Provide Name & Owner ID");
            const nameInput = new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Name (Role/Channel)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const ownerInput = new TextInputBuilder()
                .setCustomId("owner")
                .setLabel("Owner ID (optional)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Mention ID or leave empty")
                .setRequired(choice !== "channel_only");

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(ownerInput)
            );

            await interaction.showModal(modal);

            const modalInteraction = await interaction.awaitModalSubmit({
                filter: i => i.customId.startsWith(`pcreate_modal_${interaction.id}_`),
                time: 60000
            }).catch(() => null);

            if (!modalInteraction) return;
            
            // Stop collector once modal is submitted to prevent double creation
            collector.stop("success");

            await modalInteraction.deferUpdate();

            const name = modalInteraction.fields.getTextInputValue("name");
            const ownerId = modalInteraction.fields.getTextInputValue("owner");
            let ownerMember;

            if (ownerId) {
                ownerMember = await message.guild.members.fetch(ownerId).catch(() => null);
            }
            let role, vc;
            if (choice === "role_channel" || choice === "role_only") {
                role = await message.guild.roles.create({
                    name: name,
                    reason: `Created by ${message.author.tag}`
                });
                if (ownerMember) await ownerMember.roles.add(role).catch(() => { });
            }
            if (choice === "role_channel" || choice === "channel_only") {
                vc = await message.guild.channels.create({
                    name: name,
                    type: ChannelType.GuildVoice,
                    parent: guildData.premiumCategory,
                    permissionOverwrites: [
                        ...(ownerMember ? [{
                            id: ownerMember.id,
                            allow: [
                                PermissionsBitField.Flags.ManageChannels,
                                PermissionsBitField.Flags.Connect,
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        }] : []),
                        ...(role ? [{
                            id: role.id,
                            allow: [
                                PermissionsBitField.Flags.Connect,
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        }] : []),
                        { id: message.guild.id, deny: [PermissionsBitField.Flags.Connect] }
                    ],
                    userLimit: 5,
                    reason: `Created by ${message.author.tag}`
                });
            }
            await GuildSetup.create({
                guildId: message.guild.id,
                name,
                ownerId: ownerMember ? ownerMember.id : null,
                roleId: role ? role.id : null,
                channelId: vc ? vc.id : null,
                createdAt: Date.now()
            });
            const successContainer = new ContainerBuilder()
                .setAccentColor(themeColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${theme.emojis.yes || ''} __Success__\n` +
                        `> ${theme.emojis.star || ''} __Successfully created ${choice.replace("_", " ")}.__`
                    )
                );
            await sentMsg.edit({
                components: [successContainer]
            });
        });
    }
};
