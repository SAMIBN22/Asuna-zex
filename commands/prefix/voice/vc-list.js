import { EmbedBuilder } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOMS_FILE = path.join(__dirname, '../../db/privateVoiceRooms.json');

function loadRooms() {
    try {
        if (fs.existsSync(ROOMS_FILE)) return JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
    } catch (e) { console.error('Error loading voice rooms:', e); }
    return {};
}

export default {
    name: 'vc-list',
    aliases: ['vclist', 'voicelist', 'listvc', 'list-voice'],
    description: 'Show all private voice rooms in the server',
    usage: '-vc-list',
    category: 'Private Voice',
    permissions: null,

    async execute(message) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply(' This command is for the server owner only!');
        }

        const rooms = loadRooms();

        const guildRooms = Object.entries(rooms).filter(([, room]) => room.guildId === message.guild.id);

        if (guildRooms.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setTitle(' Private Voice Rooms')
                .setDescription('> There are no private voice rooms in this server yet.\n> Use `-create-voice` to create one.')
                .setColor('#5865F2')
                .setTimestamp();
            return message.reply({ embeds: [emptyEmbed] });
        }

        const fields = [];

        for (const [channelId, room] of guildRooms) {
            let ownerTag = `<@${room.ownerId}>`;
            let channelMention = `<#${channelId}>`;
            let roleMention = `<@&${room.roleId}>`;

            const channel = message.guild.channels.cache.get(channelId);
            const channelStatus = channel ? channelMention : '` Deleted`';

            const role = message.guild.roles.cache.get(room.roleId);
            const roleStatus = role ? roleMention : '` Deleted`';

            const membersInVc = channel ? channel.members.size : 0;

            fields.push({
                name: `  ${room.name || 'Unnamed Room'}`,
                value: [
                    ` **Owner:** ${ownerTag}`,
                    ` **Channel:** ${channelStatus}`,
                    ` **Role:** ${roleStatus}`,
                    ` **In Voice:** ${membersInVc} member(s)`
                ].join('\n'),
                inline: false
            });
        }

        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < fields.length; i += chunkSize) {
            chunks.push(fields.slice(i, i + chunkSize));
        }

        for (let i = 0; i < chunks.length; i++) {
            const embed = new EmbedBuilder()
                .setTitle(i === 0 ? ` Private Voice Rooms — ${guildRooms.length} Room(s)` : ` Private Voice Rooms (Page ${i + 1})`)
                .setDescription(i === 0
                    ? `> All private voice rooms created in **${message.guild.name}**`
                    : null)
                .addFields(chunks[i])
                .setColor('#5865F2')
                .setFooter({ text: `${message.guild.name} • Total: ${guildRooms.length} room(s)` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        }
    }
};
