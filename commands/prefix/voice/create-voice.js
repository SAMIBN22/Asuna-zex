import {
    EmbedBuilder,
    PermissionFlagsBits,
    PermissionsBitField,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
import config from '../../../config/config.js';
import emojis from '../../emojis.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_FILE = path.join(__dirname, '../../db/privateVoiceSettings.json');
const ROOMS_FILE = path.join(__dirname, '../../db/privateVoiceRooms.json');
const PERMS_FILE = path.join(__dirname, '../../db/voicePermissions.json');

const BOT_OWNER_IDS = (config.devIds || []).map(String);

function hasVoicePermission(guildId, userId, ownerId) {
    if (BOT_OWNER_IDS.includes(String(userId))) return true; // bot owner bypass
    if (userId === ownerId) return true;
    try {
        if (fs.existsSync(PERMS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PERMS_FILE, 'utf8'));
            return (data[guildId] || []).includes(userId);
        }
    } catch (e) {}
    return false;
}

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) { console.error('Error loading voice settings:', e); }
    return {};
}

function loadRooms() {
    try {
        if (fs.existsSync(ROOMS_FILE)) return JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
    } catch (e) { console.error('Error loading voice rooms:', e); }
    return {};
}

function saveRooms(rooms) {
    try {
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2));
    } catch (e) { console.error('Error saving voice rooms:', e); }
}

export default {
    name: 'create-voice',
    aliases: ['createvc', 'newvc', 'createroom'],
    description: 'Create a private voice room',
    usage: '-create-voice',
    category: 'Private Voice',
    permissions: null,

    async execute(message, args) {
        if (!hasVoicePermission(message.guild.id, message.author.id, message.guild.ownerId)) {
            return message.reply(' You do not have permission to use this command!');
        }

        const settings = loadSettings();
        const guildSettings = settings[message.guild.id];

        if (!guildSettings || !guildSettings.categoryId) {
            return message.reply('Please run `-set-voice-category` first!');
        }

        const uid = message.id;

        const pendingData = { personId: null, roomName: null };

        const panelEmbed = new EmbedBuilder()
            .setTitle(' Private Voice Room — Control Panel')
            .setDescription(
                '> Use the buttons below to fill in the required information.\n> Once both fields are filled, the room will be created automatically.'
            )
            .addFields(
                {
                    name: '  Person ID',
                    value: '```Not set yet```',
                    inline: true
                },
                {
                    name: '  Room Name',
                    value: '```Not set yet```',
                    inline: true
                }
            )
            .setColor('#FFFFFF')
            .setFooter({ text: 'This panel expires in 5 minutes' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`cv_person_${uid}`)
                .setLabel('  Enter Person ID')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`cv_room_${uid}`)
                .setLabel('  Enter Room Name')
                .setStyle(ButtonStyle.Primary)
        );

        const panel = await message.reply({ embeds: [panelEmbed], components: [row] });

        const collector = panel.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 300_000
        });

        async function updatePanel() {
            const updated = EmbedBuilder.from(panelEmbed)
                .spliceFields(0, 2,
                    {
                        name: '  Person ID',
                        value: pendingData.personId ? `\`\`\`${pendingData.personId}\`\`\`` : '```Not set yet```',
                        inline: true
                    },
                    {
                        name: '  Room Name',
                        value: pendingData.roomName ? `\`\`\`${pendingData.roomName}\`\`\`` : '```Not set yet```',
                        inline: true
                    }
                );
            await panel.edit({ embeds: [updated], components: [row] }).catch(() => {});
        }

        collector.on('collect', async interaction => {
            if (interaction.customId === `cv_person_${uid}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_person_${uid}`)
                    .setTitle('Enter Person Discord ID');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('person_id_input')
                            .setLabel('Discord ID (17–19 digits)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Example: 123456789012345678')
                            .setRequired(true)
                            .setMinLength(17)
                            .setMaxLength(19)
                    )
                );

                await interaction.showModal(modal);

                const submit = await interaction.awaitModalSubmit({
                    time: 60_000,
                    filter: i => i.customId === `modal_person_${uid}` && i.user.id === message.author.id
                }).catch(() => null);

                if (!submit) return;

                const value = submit.fields.getTextInputValue('person_id_input').trim();

                if (!/^\d{17,19}$/.test(value)) {
                    await submit.reply({ content: ' Invalid Discord ID! Must be 17–19 digits.', ephemeral: true });
                    return;
                }

                const member = await message.guild.members.fetch(value).catch(() => null);
                if (!member) {
                    await submit.reply({ content: ' User not found in this server! Please check the ID.', ephemeral: true });
                    return;
                }

                pendingData.personId = value;
                await submit.reply({ content: ` Person ID saved!`, ephemeral: true });
                await updatePanel();

                if (pendingData.personId && pendingData.roomName) {
                    collector.stop('ready');
                }

            } else if (interaction.customId === `cv_room_${uid}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_room_${uid}`)
                    .setTitle('Enter Room Name');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('room_name_input')
                            .setLabel('Room Name')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Example: Gaming Room')
                            .setRequired(true)
                            .setMinLength(2)
                            .setMaxLength(50)
                    )
                );

                await interaction.showModal(modal);

                const submit = await interaction.awaitModalSubmit({
                    time: 60_000,
                    filter: i => i.customId === `modal_room_${uid}` && i.user.id === message.author.id
                }).catch(() => null);

                if (!submit) return;

                pendingData.roomName = submit.fields.getTextInputValue('room_name_input').trim();
                await submit.reply({ content: ` Room name saved!`, ephemeral: true });
                await updatePanel();

                if (pendingData.personId && pendingData.roomName) {
                    collector.stop('ready');
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason !== 'ready') {
                const expiredEmbed = EmbedBuilder.from(panelEmbed)
                    .setColor('#FFFFFF')
                    .setDescription('>  This panel has expired. Please run `-create-voice` again.');
                await panel.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
                return;
            }

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`cv_person_done`)
                    .setLabel('  Enter Person ID')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`cv_room_done`)
                    .setLabel('  Enter Room Name')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );

            const creatingEmbed = EmbedBuilder.from(panelEmbed)
                .setColor('#FFFFFF')
                .setDescription('>  Creating your private voice room, please wait...');
            await panel.edit({ embeds: [creatingEmbed], components: [disabledRow] }).catch(() => {});

            try {
                const ownerMember = await message.guild.members.fetch(pendingData.personId);

                const role = await message.guild.roles.create({
                    name: pendingData.roomName,
                    reason: `Voice room role for ${pendingData.roomName}`
                });

                await ownerMember.roles.add(role);

                const voiceChannel = await message.guild.channels.create({
                    name: pendingData.roomName,
                    type: ChannelType.GuildVoice,
                    parent: guildSettings.categoryId,
                    permissionOverwrites: [
                        {
                            id: message.guild.id,
                            deny: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: role.id,
                            allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: message.client.user.id,
                            allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels]
                        }
                    ]
                });

                const rooms = loadRooms();
                rooms[voiceChannel.id] = {
                    ownerId: ownerMember.id,
                    roleId: role.id,
                    guildId: message.guild.id,
                    name: pendingData.roomName
                };
                saveRooms(rooms);

                const successEmbed = new EmbedBuilder()
                    .setTitle(' Private Voice Room Created!')
                    .setDescription('The room has been created and locked for everyone.\nOnly members with the room role can enter.')
                    .addFields(
                        { name: '  Room', value: `<#${voiceChannel.id}>`, inline: true },
                        { name: '  Owner', value: `<@${ownerMember.id}>`, inline: true },
                        { name: '  Role', value: `<@&${role.id}>`, inline: true },
                        { name: '  Status', value: 'Locked for everyone — room role only', inline: false }
                    )
                    .setColor('#FFFFFF')
                    .setTimestamp();

                await panel.edit({ embeds: [successEmbed], components: [] });

            } catch (error) {
                console.error('Error creating voice room:', error);
                const errorEmbed = EmbedBuilder.from(panelEmbed)
                    .setColor('#FFFFFF')
                    .setDescription('>  Error creating voice room. Please check bot permissions.');
                await panel.edit({ embeds: [errorEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
