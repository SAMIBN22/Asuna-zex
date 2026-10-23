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
    name: 'vc-list-members',
    aliases: ['vclistmembers', 'vcmembers', 'roommembers'],
    description: 'Show all members in a private voice room',
    usage: '-vc-list-members <room name or room ID>',
    category: 'Private Voice',
    permissions: null,

    async execute(message, args) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply(' This command is for the server owner only!');
        }

        if (!args.length) {
            return message.reply('**Usage:** `-vc-list-members <room name or room ID>`\n\n**Examples:**\n`-vc-list-members Gaming Room`\n`-vc-list-members 123456789012345678`');
        }

        const input = args.join(' ').trim();
        const rooms = loadRooms();
        const isId = /^\d{17,19}$/.test(input);

        const match = Object.entries(rooms).find(([channelId, room]) => {
            if (room.guildId !== message.guild.id) return false;
            if (isId) return channelId === input;
            return room.name && room.name.toLowerCase() === input.toLowerCase();
        });

        if (!match) {
            const label = isId ? `ID \`${input}\`` : `name **${input}**`;
            return message.reply(` No private voice room found with the ${label}.\nUse \`-vc-list\` to see all rooms.`);
        }

        const [channelId, room] = match;

        const role = message.guild.roles.cache.get(room.roleId);
        if (!role) {
            return message.reply(' The role for this room was not found. It may have been deleted.');
        }

        try {
            await message.guild.members.fetch({ force: false });
        } catch (e) {
            if (e.constructor?.name === 'GatewayRateLimitError' || e.code === 'GatewayRateLimitError') {
                const retryAfter = e.data?.retry_after ?? 20;
                return message.reply(` **Rate Limited** — Discord is limiting member fetching. Please try again in **${Math.ceil(retryAfter)} seconds**.`);
            }
        }

        const members = message.guild.members.cache.filter(m => m.roles.cache.has(role.id));
        const channel = message.guild.channels.cache.get(channelId);
        const inVoice = channel ? channel.members.map(m => m.id) : [];

        let memberLines = [];
        let counter = 1;

        members.forEach(m => {
            const isInVc = inVoice.includes(m.id);
            const isOwner = m.id === room.ownerId;
            const badge = isOwner ? '' : isInVc ? '' : '';
            const displayName = m.nickname || m.user.username;
            const tag = `${badge} **${displayName}** (<@${m.id}>)`;
            const suffix = isOwner ? ' — Owner' : isInVc ? ' — In Voice' : '';
            memberLines.push(`\`${counter}.\` ${tag}${suffix}`);
            counter++;
        });

        const ownerMember = message.guild.members.cache.get(room.ownerId);
        const ownerDisplay = ownerMember
            ? `${ownerMember.nickname || ownerMember.user.username} (<@${room.ownerId}>)`
            : `<@${room.ownerId}>`;

        const embed = new EmbedBuilder()
            .setTitle(` ${room.name} — Members List`)
            .setDescription(
                memberLines.length > 0
                    ? memberLines.join('\n')
                    : '> No members have access to this room yet.'
            )
            .addFields(
                { name: '  Owner', value: ownerDisplay, inline: true },
                { name: '  Channel', value: channel ? `<#${channelId}>` : '` Deleted`', inline: true },
                { name: '  Total Members', value: `${members.size} member(s)`, inline: true }
            )
            .setColor('#5865F2')
            .setFooter({ text: ` Owner  •   In Voice  •   Has Access` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
