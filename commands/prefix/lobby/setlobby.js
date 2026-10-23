// ─── &setlobby — Solo Lobby System Setup ──────────────────────────────────────
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';

const div  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
const divS = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

// ─── Session state ─────────────────────────────────────────────────────────────
const _temp = new Map();

function _initTemp(guildId, config) {
    if (_temp.has(guildId)) return;
    const saved = config?.lobbyConfig || {};
    _temp.set(guildId, {
        categoryId:   saved.categoryId   || null,
        joinChannelId: saved.joinChannelId || null,
        logsChannelId: saved.logsChannelId || null,
        enabled:       saved.enabled       ?? true,
    });
}

function _getTemp(guildId) { return _temp.get(guildId); }

async function _saveConfig(guildId, data) {
    await GuildConfig.findOneAndUpdate(
        { guildId },
        { $set: { lobbyConfig: { ...data } } },
        { upsert: true, strict: false }
    );
}

// ─── Permission check ──────────────────────────────────────────────────────────
function _hasPermission(message, client) {
    const guild  = message.guild;
    const member = message.member;
    if (guild.ownerId === member.id) return true;
    const devIds = (client.config?.devIds || []).map(String);
    if (devIds.includes(String(member.id))) return true;
    return false;
}

// ─── Main config panel ─────────────────────────────────────────────────────────
function _buildMain(guildId, guild, themeColor) {
    const d = _getTemp(guildId);
    const statusIcon = d.enabled ? '' : '';
    const statusText = d.enabled ? 'Enabled' : 'Disabled';

    return new ContainerBuilder().setAccentColor(themeColor)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`##   Solo Lobby — Configuration`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                )
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> **Status:** ${statusIcon} ${statusText}\n` +
                `> **Category:** ${d.categoryId ? `<#${d.categoryId}>` : '`Not set`'}\n` +
                `> **Hub Channel:** ${d.joinChannelId ? `<#${d.joinChannelId}>` : '`Not set`'}\n` +
                `> **Logs Channel:** ${d.logsChannelId ? `<#${d.logsChannelId}>` : '`Not set`'}`
            )
        )
        .addSeparatorComponents(div())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> **1.** Select the **category** where lobby rooms are created.\n` +
                `> **2.** Select the **hub voice channel** members join to get a lobby.\n` +
                `> **3.** Select the **logs text channel** where welcome panels appear.`
            )
        )
        .addSeparatorComponents(divS())
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('slb_category').setLabel('Set Category').setEmoji({name:'edfef',id:'1528076477114093699',animated:true}).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('slb_joinchan').setLabel(' Set Hub Channel').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('slb_logschan').setLabel(' Set Logs Channel').setStyle(ButtonStyle.Secondary),
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                d.enabled
                    ? new ButtonBuilder().setCustomId('slb_disable').setLabel(' Disable').setStyle(ButtonStyle.Danger)
                    : new ButtonBuilder().setCustomId('slb_enable').setLabel(' Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('slb_done').setLabel(' Save & Done').setStyle(ButtonStyle.Primary),
            )
        );
}

function _buildPicker(label, type, selectId, themeColor) {
    const menu = new ChannelSelectMenuBuilder()
        .setCustomId(selectId)
        .setPlaceholder(`Select ${label}`)
        .setChannelTypes(...(Array.isArray(type) ? type : [type]));

    return new ContainerBuilder().setAccentColor(themeColor)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${label}\n> Select from the dropdown below.`)
        )
        .addSeparatorComponents(divS())
        .addActionRowComponents(new ActionRowBuilder().addComponents(menu))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('slb_back').setLabel('← Back').setStyle(ButtonStyle.Secondary)
            )
        );
}

// ─── Export ────────────────────────────────────────────────────────────────────
export default {
    name: 'setlobby',
    aliases: ['lobbyset', 'solosetup', 'lobbysetup'],
    description: 'Configure the Solo Lobby voice room system',
    usage: '&setlobby',
    category: 'Lobby',

    async execute(message, args, client) {
        if (!_hasPermission(message, client)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##   Access Denied\n` +
                                `> Only the **server owner** or **bot owners** can configure the Lobby system.`
                            )
                        )
                ],
            });
        }

        const guildId    = message.guild.id;
        const config     = await GuildConfig.findOne({ guildId });
        const theme      = await themeManager.getTheme(guildId);
        const themeColor = Number(theme.color) || 0x5865F2;
        const guild      = message.guild;

        _temp.delete(guildId);
        _initTemp(guildId, config);

        const sent = await message.reply({
            flags:      MessageFlags.IsComponentsV2,
            components: [_buildMain(guildId, guild, themeColor)],
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id && i.customId.startsWith('slb_'),
            time:   600_000,
        });

        collector.on('collect', async interaction => {
            try {
                const id   = interaction.customId;
                const data = _getTemp(guildId);

                if (id === 'slb_back') {
                    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [_buildMain(guildId, guild, themeColor)] });
                }

                if (id === 'slb_enable' || id === 'slb_disable') {
                    data.enabled = id === 'slb_enable';
                    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [_buildMain(guildId, guild, themeColor)] });
                }

                if (id === 'slb_category') {
                    return interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [_buildPicker('Select Category', ChannelType.GuildCategory, 'slb_category_select', themeColor)],
                    });
                }
                if (id === 'slb_category_select') {
                    data.categoryId = interaction.values[0];
                    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [_buildMain(guildId, guild, themeColor)] });
                }

                if (id === 'slb_joinchan') {
                    return interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [_buildPicker(' Select Hub Voice Channel', ChannelType.GuildVoice, 'slb_joinchan_select', themeColor)],
                    });
                }
                if (id === 'slb_joinchan_select') {
                    data.joinChannelId = interaction.values[0];
                    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [_buildMain(guildId, guild, themeColor)] });
                }

                if (id === 'slb_logschan') {
                    return interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [_buildPicker(' Select Logs Text Channel', ChannelType.GuildText, 'slb_logschan_select', themeColor)],
                    });
                }
                if (id === 'slb_logschan_select') {
                    data.logsChannelId = interaction.values[0];
                    return interaction.update({ flags: MessageFlags.IsComponentsV2, components: [_buildMain(guildId, guild, themeColor)] });
                }

                if (id === 'slb_done') {
                    await _saveConfig(guildId, data);
                    collector.stop('done');
                    return interaction.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [
                            new ContainerBuilder().setAccentColor(0x57F287)
                                .addSectionComponents(
                                    new SectionBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(
                                                `##   Solo Lobby Configured!\n` +
                                                `> Members who join <#${data.joinChannelId || '?'}> will receive their own private lobby automatically.\n` +
                                                `> Lobby logs will appear in <#${data.logsChannelId || '?'}>.`
                                            )
                                        )
                                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL()))
                                )
                        ],
                    });
                }

            } catch (err) {
                console.error('[setlobby] Collector error:', err);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'done') {
                sent.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        new ContainerBuilder().setAccentColor(0x5865F2)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `##   Session Expired\n> Run \`&setlobby\` again to continue.`
                                )
                            )
                    ],
                }).catch(() => {});
            }
        });
    },
};
