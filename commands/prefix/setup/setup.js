import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} from 'discord.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import GuildConfig from '../../../models/guildConfig.js';
import themeManager from '../../../themes/themeManager.js';
import { getPanelBanner } from '../../../utils/panelBanner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Local GIF shown at the bottom of every panel page (separate file from help's divider.gif)
const DIVIDER_FILE = {
    attachment: join(__dirname, '../../../assets/images/setup_divider.gif'),
    name: 'setup_divider.gif',
};

// ─── Command → name map ────────────────────────────────────────────────────────
const CMD_MAP = {
    setup_setwarn:       'setwarn',
    setup_setjail:       'setjail',
    setup_setverify:     'setverify',
    setup_setaid:        'setneedhelp',
    setup_prefix:        'prefix',
    setup_aliases:       'aliases',
    setup_selfroles:     'selfroles',
    setup_antilink:      'antilink',
    setup_antibots:      'antibots',
    setup_antiraid:      'antiraid',
    setup_antitokens:    'antitokens',
    setup_setwelcome:    'setwelcome',
    setup_setticket:     'setticket',
    setup_setnick:       'setnick',
    setup_setstats:      'setstats',
    setup_setstaff:      'setstaff',
    setup_setprivate:    'setprivate',
    setup_setvcalert:    'setvcalert',
    setup_setlobby:      'setlobby',
    setup_container:     'container',
    setup_servermap:     'servermap',
    setup_rolerequest:   'rolerequest',
    setup_setdating:     'setdating',
};

// ─── Pages ─────────────────────────────────────────────────────────────────────
const PAGES = [
    {
        title: 'Core Systems',
        items: [
            { id: 'setup_setwarn',   label: 'Warn System',   text: 'Configure warn punishment roles & log channel' },
            { id: 'setup_setjail',   label: 'Jail System',   text: 'Configure jail detention roles & voice channel' },
            { id: 'setup_setverify', label: 'Verify System', text: 'Configure member identity verification system' },
            { id: 'setup_setaid',    label: 'Need Help',     text: 'Configure need help support ticket system' },
        ],
    },
    {
        title: 'Bot Configuration',
        items: [
            { id: 'setup_prefix',    label: 'Prefix',     text: 'Configure bot command prefix for this server' },
            { id: 'setup_aliases',   label: 'Aliases',    text: 'Create custom shortcut aliases for commands' },
            { id: 'setup_selfroles', label: 'Self Roles', text: 'Configure self-assignable role menu for members' },
        ],
    },
    {
        title: 'Security & Protection',
        items: [
            { id: 'setup_antilink',   label: 'Anti Link',   text: 'Configure automatic anti-link message filtering' },
            { id: 'setup_antibots',   label: 'Anti Bots',   text: 'Configure anti-bot auto-join protection system' },
            { id: 'setup_antiraid',   label: 'Anti Raid',   text: 'Configure anti-raid mass-join detection system' },
            { id: 'setup_antitokens', label: 'Anti Tokens', text: 'Configure anti-token Discord token leak detection' },
        ],
    },
    {
        title: 'Server Tools',
        items: [
            { id: 'setup_setwelcome', label: 'Welcome',    text: 'Configure welcome channel, message & boost channel' },
            { id: 'setup_setticket',  label: 'Ticket',     text: 'Configure ticket channel, admin roles & logs' },
            { id: 'setup_setnick',    label: 'Nicknames',  text: 'Configure joined tag and nickname management' },
            { id: 'setup_setstaff',   label: 'Play Staff', text: 'Configure staff application panel & positions' },
        ],
    },
    {
        title: 'Voice Systems',
        items: [
            { id: 'setup_setstats',   label: 'Server Stats',  text: 'Configure and auto-post the server stats panel every 24h' },
            { id: 'setup_setprivate', label: 'Private Rooms', text: 'Configure automatic private voice room system' },
            { id: 'setup_setvcalert', label: 'VC Alert',      text: 'Alert staff roles when members join voice channels' },
            { id: 'setup_setlobby',   label: 'Solo Lobby',    text: 'Configure the Solo Lobby system — personal voice rooms with owner controls' },
        ],
    },
    {
        title: 'Builder Tools',
        items: [
            { id: 'setup_container',   label: 'Container Builder', text: 'Interactively build and send Components V2 containers to any channel' },
            { id: 'setup_servermap',   label: 'Server Map',        text: 'Build and post a professional server channel map for your community' },
            { id: 'setup_rolerequest', label: 'Role Request',      text: 'Configure the Role Request System — categories, channels, and public panel' },
        ],
    },
    {
        title: 'Community Systems',
        items: [
            { id: 'setup_setdating', label: '𝐀𝐬𝐮𝐧𝐚Cord Dating', text: 'Configure the 𝐀𝐬𝐮𝐧𝐚Cord Profile & Dating System — panel, male/female and thread channels' },
        ],
    },
];

// ─── Export ────────────────────────────────────────────────────────────────────
export default {
    name: 'setup',
    aliases: ['configure', 'config', 'panel'],
    description: 'Open the main bot setup control panel',
    category: 'Setup',
    usage: '&setup',

    async execute(message, args, client) {
        const theme  = await themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addSeparatorComponents(div())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `##   Access Restricted\n` +
                                        `> This panel requires **Administrator** permission to use.`
                                    )
                                )
                                .setButtonAccessory(
                                    new ButtonBuilder()
                                        .setCustomId('denied_noop')
                                        .setLabel('No Access')
                                        .setStyle(ButtonStyle.Danger)
                                        .setDisabled(true)
                                )
                        )
                        .addSeparatorComponents(div())
                ],
                allowedMentions: { parse: [] },
            });
        }

        let settings = await GuildConfig.findOne({ guildId: message.guild.id });
        const prefix = settings?.prefix || client.config?.prefix || '&';
        let page     = 0;

        // First send — include the divider GIF so Discord attaches it to the message.
        // All subsequent interaction.update() calls omit the file; Discord keeps it.
        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            files: [DIVIDER_FILE],
            components: buildPanel(message.guild, accent, prefix, page, client, false, settings?.panelBannerUrl),
            allowedMentions: { parse: [] },
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 300_000,
        });

        collector.on('collect', async interaction => {
            const id = interaction.customId;

            // ── Navigation ─────────────────────────────────────────────────
            if (id === 'setup_prev') {
                page = Math.max(0, page - 1);
                settings = await GuildConfig.findOne({ guildId: message.guild.id });
                return interaction.update({
                    components: buildPanel(message.guild, accent, prefix, page, client, false, settings?.panelBannerUrl),
                });
            }
            if (id === 'setup_next') {
                page = Math.min(PAGES.length - 1, page + 1);
                settings = await GuildConfig.findOne({ guildId: message.guild.id });
                return interaction.update({
                    components: buildPanel(message.guild, accent, prefix, page, client, false, settings?.panelBannerUrl),
                });
            }

            // ── Command buttons ────────────────────────────────────────────
            const cmdName = CMD_MAP[id];
            if (!cmdName) return;
            await interaction.deferUpdate().catch(() => {});

            const cmd = client.prefixCommands.get(cmdName);
            if (!cmd) {
                return interaction.followUp({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `##   Command Not Loaded\n> \`${prefix}${cmdName}\` is not currently available.`
                        ))],
                }).catch(() => {});
            }

            try {
                await cmd.execute(message, [], client);
            } catch (err) {
                await interaction.followUp({
                    content: ` ${err.message}`,
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
        });

        collector.on('end', () => {
            GuildConfig.findOne({ guildId: message.guild.id }).then(s => {
                sent.edit({
                    components: buildPanel(message.guild, accent, prefix, page, client, true, s?.panelBannerUrl),
                }).catch(() => {});
            });
        });
    },
};

// ─── Separator helper ──────────────────────────────────────────────────────────
function div(small = false) {
    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(small ? SeparatorSpacingSize.Small : SeparatorSpacingSize.Large);
}

// ─── Panel builder ─────────────────────────────────────────────────────────────
function buildPanel(guild, accent, prefix, page, client, expired = false, customBannerUrl = null) {
    const total    = PAGES.length;
    const pageData = PAGES[page];
    const bannerUrl = customBannerUrl || getPanelBanner(guild, client);

    const c = new ContainerBuilder().setAccentColor(accent);

    // [1] Top banner
    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
                .setURL(bannerUrl)
                .setDescription(`${guild.name} — AID Control Panel`)
        )
    );

    c.addSeparatorComponents(div());

    // [2] Header
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Server Setup  •  Page ${page + 1}/${total}`)
    );

    c.addSeparatorComponents(div());

    // [3] Feature items
    pageData.items.forEach(item => {
        c.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `•   __${item.text}__  ∴`
                    )
                )
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setCustomId(item.id)
                        .setLabel(item.label)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(expired)
                )
        );
        c.addSeparatorComponents(div(true));
    });

    // [4] Navigation row
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setup_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired || page === 0),
            new ButtonBuilder()
                .setCustomId('setup_page_noop')
                .setLabel(`Page ${page + 1} / ${total}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('setup_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(expired || page === total - 1)
        )
    );

    c.addSeparatorComponents(div());

    // [5] Footer divider GIF — name must match DIVIDER_FILE.name exactly
    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
                .setURL('attachment://setup_divider.gif')
                .setDescription('Divider')
        )
    );

    return [c];
}
