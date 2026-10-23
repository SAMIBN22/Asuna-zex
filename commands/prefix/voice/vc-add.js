import { PermissionsBitField, PermissionFlagsBits } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOMS_FILE = path.join(__dirname, '../../db/privateVoiceRooms.json');

function loadRooms() {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            return JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading voice rooms:', error);
    }
    return {};
}

export default {
    name: 'vc-add',
    aliases: ['vcadd', 'addvc', 'voiceadd'],
    description: 'Add a member to your private voice room',
    usage: '-vc-add <person name> <person ID>',
    category: 'Private Voice',

    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('**Usage:** `-vc-add <person name> <person ID>`\n\n**Example:** `-vc-add Ahmed 123456789012345678`');
        }

        const userId = args[args.length - 1].replace(/[<@!>]/g, '');
        const personName = args.slice(0, args.length - 1).join(' ');

        if (!/^\d{17,19}$/.test(userId)) {
            return message.reply('Invalid user ID! Please provide a valid Discord ID.\n**Example:** `-vc-add Ahmed 123456789012345678`');
        }

        const isAdmin = message.author.id === message.guild.ownerId ||
                        message.member.permissions.has(PermissionFlagsBits.Administrator);

        const rooms = loadRooms();
        let userVoiceRoom = null;

        for (const [channelId, room] of Object.entries(rooms)) {
            if (room.guildId !== message.guild.id) continue;

            if (room.ownerId === message.author.id) {
                userVoiceRoom = { channelId, ...room };
                break;
            }

            if (isAdmin && !userVoiceRoom) {
                userVoiceRoom = { channelId, ...room };
            }
        }

        if (!userVoiceRoom) {
            return message.reply('No private voice room found in this server!');
        }

        try {
            const targetMember = await message.guild.members.fetch(userId).catch(() => null);

            if (!targetMember) {
                return message.reply('User not found in this server! Please check the ID.');
            }

            const role = message.guild.roles.cache.get(userVoiceRoom.roleId);

            if (!role) {
                return message.reply('Voice room role not found!');
            }

            const voiceChannel = message.guild.channels.cache.get(userVoiceRoom.channelId);

            await targetMember.roles.add(role);

            if (voiceChannel) {
                await voiceChannel.permissionOverwrites.edit(targetMember.id, {
                    [PermissionsBitField.Flags.Connect]: true,
                    [PermissionsBitField.Flags.ViewChannel]: true
                });
            }

            await message.reply(` **${personName}** (<@${targetMember.id}>) has been added to the voice room!\nThey have been given the role <@&${role.id}> and access to the channel.`);
        } catch (error) {
            console.error('Error adding member:', error);
            await message.reply('Error adding member to voice room. Please check bot permissions.');
        }
    }
};
