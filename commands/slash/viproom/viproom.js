import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';
import VipRoom from '../../../models/vipRoom.js';

async function findRoom(guildId, userId, requireOwner = false) {
    const room = await VipRoom.findOne({ guildId, $or: [{ ownerId: userId }, { managers: userId }] });
    if (!room) return null;
    if (requireOwner && room.ownerId !== userId) return 'not-owner';
    return room;
}

function reply(interaction, content) {
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export default {
    data: new SlashCommandBuilder()
        .setName('viproom')
        .setDescription('Manage the VIP room you own')
        .addSubcommand(sub => sub.setName('kick').setDescription('Kick a member from your VIP voice room')
            .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true)))
        .addSubcommand(sub => sub.setName('lock').setDescription('Lock your VIP room to prevent new members from joining'))
        .addSubcommand(sub => sub.setName('unlock').setDescription('Unlock your VIP room to allow members back in'))
        .addSubcommand(sub => sub.setName('permit').setDescription('Grant a member access to manage and join your VIP room')
            .addUserOption(o => o.setName('user').setDescription('Member to permit').setRequired(true)))
        .addSubcommand(sub => sub.setName('mute').setDescription('Server-mute a member inside your VIP room')
            .addUserOption(o => o.setName('user').setDescription('Member to mute').setRequired(true)))
        .addSubcommand(sub => sub.setName('unmute').setDescription('Remove the server-mute from a member in your VIP room')
            .addUserOption(o => o.setName('user').setDescription('Member to unmute').setRequired(true)))
        .addSubcommand(sub => sub.setName('limit').setDescription('Set the user limit of your VIP voice room')
            .addIntegerOption(o => o.setName('amount').setDescription('0 for unlimited').setRequired(true).setMinValue(0).setMaxValue(99)))
        .addSubcommand(sub => sub.setName('rename').setDescription('Rename your VIP voice and chat rooms')
            .addStringOption(o => o.setName('name').setDescription('New room name').setRequired(true).setMaxLength(90)))
        .addSubcommand(sub => sub.setName('transfer').setDescription('Transfer ownership of your VIP room to another member')
            .addUserOption(o => o.setName('user').setDescription('New owner').setRequired(true)))
        .addSubcommand(sub => sub.setName('hide').setDescription('Toggle visibility of your VIP room for everyone else')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const requireOwner = sub === 'permit' || sub === 'transfer';

        const room = await findRoom(guild.id, interaction.user.id, requireOwner);
        if (!room) {
            return reply(interaction, ">  You don't own a VIP room, or you don't have permission to manage it.");
        }
        if (room === 'not-owner') {
            return reply(interaction, '>  Only the owner of the VIP room can use this command.');
        }

        const voiceChannel = guild.channels.cache.get(room.voiceChannelId) ||
            await guild.channels.fetch(room.voiceChannelId).catch(() => null);
        const textChannel = room.textChannelId
            ? (guild.channels.cache.get(room.textChannelId) || await guild.channels.fetch(room.textChannelId).catch(() => null))
            : null;

        if (!voiceChannel) {
            await room.deleteOne().catch(() => {});
            return reply(interaction, '>  Your VIP room no longer exists.');
        }

        try {
            switch (sub) {
                case 'kick': {
                    const target = interaction.options.getUser('user');
                    const targetMember = await guild.members.fetch(target.id).catch(() => null);
                    if (!targetMember || targetMember.voice.channelId !== voiceChannel.id) {
                        return reply(interaction, '>  That member is not in your VIP room.');
                    }
                    await targetMember.voice.disconnect('Kicked by VIP room owner');
                    return reply(interaction, `>  **${targetMember.user.tag}** was kicked from your VIP room.`);
                }

                case 'lock': {
                    await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
                    if (room.roleId) await voiceChannel.permissionOverwrites.edit(room.roleId, { Connect: false });
                    room.locked = true;
                    await room.save();
                    return reply(interaction, '>  Your VIP room is now **locked**.');
                }

                case 'unlock': {
                    await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
                    if (room.roleId) await voiceChannel.permissionOverwrites.edit(room.roleId, { Connect: true });
                    room.locked = false;
                    await room.save();
                    return reply(interaction, '>  Your VIP room is now **unlocked**.');
                }

                case 'permit': {
                    const target = interaction.options.getUser('user');
                    const targetMember = await guild.members.fetch(target.id).catch(() => null);
                    if (!targetMember) return reply(interaction, '>  Could not find that member in this server.');

                    if (!room.managers.includes(target.id)) {
                        room.managers.push(target.id);
                        await room.save();
                    }
                    if (room.roleId) await targetMember.roles.add(room.roleId, 'Permitted to VIP room').catch(() => {});
                    await voiceChannel.permissionOverwrites.edit(target.id, { ViewChannel: true, Connect: true, Speak: true }).catch(() => {});
                    if (textChannel) await textChannel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true }).catch(() => {});
                    return reply(interaction, `>  **${targetMember.user.tag}** has been permitted into your VIP room.`);
                }

                case 'mute': {
                    const target = interaction.options.getUser('user');
                    const targetMember = await guild.members.fetch(target.id).catch(() => null);
                    if (!targetMember || targetMember.voice.channelId !== voiceChannel.id) {
                        return reply(interaction, '>  That member is not in your VIP room.');
                    }
                    await targetMember.voice.setMute(true, 'Muted by VIP room owner');
                    if (!room.mutedUsers.includes(target.id)) {
                        room.mutedUsers.push(target.id);
                        await room.save();
                    }
                    return reply(interaction, `>  **${targetMember.user.tag}** has been muted in your VIP room.`);
                }

                case 'unmute': {
                    const target = interaction.options.getUser('user');
                    const targetMember = await guild.members.fetch(target.id).catch(() => null);
                    if (!targetMember || targetMember.voice.channelId !== voiceChannel.id) {
                        return reply(interaction, '>  That member is not in your VIP room.');
                    }
                    await targetMember.voice.setMute(false, 'Unmuted by VIP room owner');
                    room.mutedUsers = room.mutedUsers.filter(id => id !== target.id);
                    await room.save();
                    return reply(interaction, `>  **${targetMember.user.tag}** has been unmuted in your VIP room.`);
                }

                case 'limit': {
                    const amount = interaction.options.getInteger('amount');
                    await voiceChannel.setUserLimit(amount);
                    return reply(interaction, `>  VIP room user limit set to **${amount === 0 ? 'Unlimited' : amount}**.`);
                }

                case 'rename': {
                    const name = interaction.options.getString('name').slice(0, 90);
                    await voiceChannel.setName(` ${name}`).catch(() => {});
                    if (textChannel) {
                        const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'vip-room';
                        await textChannel.setName(slug).catch(() => {});
                    }
                    room.roomName = name;
                    await room.save();
                    return reply(interaction, `>  Your VIP room has been renamed to **${name}**.`);
                }

                case 'transfer': {
                    const target = interaction.options.getUser('user');
                    const targetMember = await guild.members.fetch(target.id).catch(() => null);
                    if (!targetMember) return reply(interaction, '>  Could not find that member in this server.');

                    const previousOwnerId = room.ownerId;
                    room.ownerId = target.id;
                    if (!room.managers.includes(previousOwnerId)) room.managers.push(previousOwnerId);
                    room.managers = room.managers.filter(id => id !== target.id);
                    await room.save();

                    if (room.roleId) await targetMember.roles.add(room.roleId, 'Received VIP room ownership').catch(() => {});
                    await voiceChannel.permissionOverwrites.edit(target.id, { ViewChannel: true, Connect: true, Speak: true, ManageChannels: true }).catch(() => {});
                    if (textChannel) await textChannel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true }).catch(() => {});

                    return reply(interaction, `>  Ownership of your VIP room has been transferred to **${targetMember.user.tag}**.`);
                }

                case 'hide': {
                    room.hidden = !room.hidden;
                    await voiceChannel.permissionOverwrites.edit(guild.id, { ViewChannel: !room.hidden }).catch(() => {});
                    if (textChannel) await textChannel.permissionOverwrites.edit(guild.id, { ViewChannel: !room.hidden }).catch(() => {});
                    await room.save();
                    return reply(interaction, room.hidden
                        ? '>  Your VIP room is now **hidden** from other members.'
                        : '>  Your VIP room is now **visible** to other members.');
                }

                default:
                    return reply(interaction, '>  Unknown VIP room command.');
            }
        } catch (err) {
            console.error('[viproom] Error:', err);
            return reply(interaction, '>  Something went wrong while running that command.');
        }
    }
};
