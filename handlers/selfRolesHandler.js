import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import SelfRoleConfig from '../models/selfRoleConfig.js';
import { getPanelBanner } from '../utils/panelBanner.js';
import { getSafeEmoji } from '../utils/emoji.js';

const CATEGORY_INFO = {
    gender: { name: 'Gender Roles' },
    games: { name: 'Game Roles' },
    continent: { name: 'Continent Roles' },
    age: { name: 'Age Roles' },
    personality: { name: 'Personality Roles' },
    situation: { name: 'Situation Roles' }
};

function normalizePresentationSettings(settings = {}) {
    return {
        placement: ['combined', 'standalone'].includes(settings.placement) ? settings.placement : 'combined',
        displayMode: ['buttons', 'select', 'emoji'].includes(settings.displayMode) ? settings.displayMode : 'buttons',
        sortOrder: ['configured', 'name_asc', 'name_desc'].includes(settings.sortOrder)
            ? settings.sortOrder
            : 'configured'
    };
}

function sortMappings(mappings, sortOrder) {
    const ordered = [...mappings];
    if (sortOrder === 'name_asc') return ordered.sort((a, b) => a.optionName.localeCompare(b.optionName));
    if (sortOrder === 'name_desc') return ordered.sort((a, b) => b.optionName.localeCompare(a.optionName));
    return ordered;
}

function getValidMappings(interaction, categoryData, presentation) {
    return sortMappings(categoryData?.mappings || [], presentation.sortOrder)
        .filter((mapping) => mapping.roleId && interaction.guild.roles.cache.has(mapping.roleId))
        .slice(0, 25);
}

function buildRolePanel(interaction, client, category, categoryData, theme) {
    const catInfo = CATEGORY_INFO[category] || { name: 'Self Roles' };
    const presentation = normalizePresentationSettings(categoryData);
    const mappings = getValidMappings(interaction, categoryData, presentation);
    const themeColor = client.themeManager.getRGBColor(theme.color);
    const fallbackEmoji = getSafeEmoji(theme.emojis?.star, '⭐', client, interaction.guild);

    const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${theme.emojis?.title || ''} __${catInfo.name}__`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                    .setURL(getPanelBanner(interaction.guild, client, theme))
                    .setDescription(`${catInfo.name} role selection`)
            )
        )
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> ${theme.emojis?.star || '•'} Choose a role below to add or remove it.\n` +
                        `> Your selection is applied instantly and can be changed at any time.`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(theme.images?.thumbnail || client.user.displayAvatarURL())
                )
        )
        .addSeparatorComponents(new SeparatorBuilder());

    if (mappings.length === 0) {
        return container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> No available roles were found for this category.')
        );
    }

    if (presentation.displayMode === 'select') {
        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId(`selfroles_role_select_${category}`)
            .setPlaceholder(`Choose a ${catInfo.name.toLowerCase()} option`)
            .addOptions(
                mappings.map((mapping) => {
                    const option = new StringSelectMenuOptionBuilder()
                        .setLabel(mapping.optionName)
                        .setValue(mapping.roleId)
                        .setDescription('Click to toggle this role');
                    option.setEmoji(getSafeEmoji(mapping.emoji, '✨', client, interaction.guild));
                    return option;
                })
            );
        container.addActionRowComponents(new ActionRowBuilder().addComponents(roleSelect));
        return container;
    }

    let row = new ActionRowBuilder();
    let rowCount = 0;
    for (const mapping of mappings) {
        const button = new ButtonBuilder()
            .setCustomId(`selfrole_${mapping.roleId}`)
            .setStyle(ButtonStyle.Secondary);

        if (presentation.displayMode === 'emoji') {
            button.setEmoji(getSafeEmoji(mapping.emoji, fallbackEmoji, client, interaction.guild));
        } else {
            button.setLabel(mapping.optionName.slice(0, 80));
            button.setEmoji(getSafeEmoji(mapping.emoji, fallbackEmoji, client, interaction.guild));
        }

        row.addComponents(button);
        rowCount++;
        if (rowCount === 5) {
            container.addActionRowComponents(row);
            row = new ActionRowBuilder();
            rowCount = 0;
        }
    }
    if (rowCount > 0) container.addActionRowComponents(row);
    return container;
}

async function toggleRole(interaction, roleId) {
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) throw new Error('Role not found.');

    const hasRole = interaction.member.roles.cache.has(roleId);
    if (hasRole) {
        await interaction.member.roles.remove(roleId);
        return { role, added: false };
    }

    await interaction.member.roles.add(roleId);
    return { role, added: true };
}

async function loadCategory(interaction, category) {
    const config = await SelfRoleConfig.findOne({ guildId: interaction.guild.id });
    if (!config || !config.enabled) return { config: null, categoryData: null };
    return { config, categoryData: config.categories?.[category] };
}

// Handle public self roles interactions for both combined and standalone panels.
export async function handleSelfRolesInteraction(interaction, client) {
    const customId = interaction.customId;
    const theme = await client.themeManager.getTheme(interaction.guild.id);

    if (customId === 'selfroles_category') {
        const category = interaction.values[0];
        const { config, categoryData } = await loadCategory(interaction, category);

        if (!config) {
            await interaction.reply({
                content: 'The self-roles system is not configured.',
                ephemeral: true
            }).catch(() => {});
            return;
        }
        if (!categoryData?.mappings?.length) {
            await interaction.reply({
                content: 'No roles are configured for this category yet.',
                ephemeral: true
            }).catch(() => {});
            return;
        }

        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        await interaction.editReply({
            components: [buildRolePanel(interaction, client, category, categoryData, theme)],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
        return;
    }

    if (customId.startsWith('selfroles_role_select_')) {
        const category = customId.replace('selfroles_role_select_', '');
        const { config, categoryData } = await loadCategory(interaction, category);
        if (!config || !categoryData) {
            await interaction.reply({ content: 'This role panel is no longer available.', ephemeral: true }).catch(() => {});
            return;
        }

        const roleId = interaction.values[0];
        try {
            const result = await toggleRole(interaction, roleId);
            await interaction.reply({
                content: `${result.added ? 'Role added' : 'Role removed'}: <@&${roleId}>`,
                ephemeral: true
            });
        } catch {
            await interaction.reply({
                content: 'I could not modify that role. Please check my role hierarchy and permissions.',
                ephemeral: true
            }).catch(() => {});
        }
        return;
    }

    if (customId.startsWith('selfrole_')) {
        const roleId = customId.replace('selfrole_', '');
        try {
            const result = await toggleRole(interaction, roleId);
            await interaction.reply({
                content: `${result.added ? 'Role added' : 'Role removed'}: <@&${roleId}>`,
                ephemeral: true
            });
        } catch {
            await interaction.reply({
                content: 'I could not modify that role. Please check my role hierarchy and permissions.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}