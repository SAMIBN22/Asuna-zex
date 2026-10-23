import {
    ChannelType,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    MessageFlags
} from 'discord.js';
import GuildConfig from '../models/guildConfig.js';
import VipRoom from '../models/vipRoom.js';

function isOwnerOrDev(interaction, client) {
    return interaction.guild.ownerId === interaction.user.id ||
        client.config?.devIds?.includes(interaction.user.id);
}

function resultContainer(theme, botAvatar, title, description) {
    return new ContainerBuilder().setAccentColor(theme.color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${title}\n\n${description}`)
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(botAvatar))
        );
}

function parseUserId(raw) {
    const match = raw.trim().match(/^<@!?(\d{17,20})>$|^(\d{17,20})$/);
    if (!match) return null;
    return match[1] || match[2];
}

export async function handleVipSetupButton(interaction, client) {
    if (!isOwnerOrDev(interaction, client)) {
        return interaction.reply({ content: '> 🚫 Only the server owner can confirm this setup.', flags: MessageFlags.Ephemeral });
    }

    const cid = interaction.customId;
    const isSave = cid.startsWith('vip_setup_save_');
    const prefix = isSave ? 'vip_setup_save_' : 'vip_setup_cancel_';
    const [voiceCategoryId, chatCategoryId, joinChannelId] = cid.slice(prefix.length).split('_');

    const theme = await client.themeManager.getTheme(interaction.guild.id);
    const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 512 });

    if (isSave) {
        await GuildConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            {
                vipRoomConfig: {
                    enabled: true,
                    joinChannelId,
                    voiceCategoryId,
                    chatCategoryId,
                },
            },
            { upsert: true, new: true }
        );

        return interaction.update({
            components: [resultContainer(theme, botAvatar, '✅ VIP Room Setup Saved',
                `The VIP Room system is now active.\n\n` +
                `> **Join to Create:** <#${joinChannelId}>\n` +
                `> Use \`/vip-create\` to provision a dedicated VIP room for a member.`)],
            flags: MessageFlags.IsComponentsV2,
        });
    }

    // Cancel — delete the channels that were created for preview
    for (const id of [joinChannelId, voiceCategoryId, chatCategoryId]) {
        const ch = interaction.guild.channels.cache.get(id);
        if (ch) await ch.delete('VIP room setup cancelled').catch(() => {});
    }

    return interaction.update({
        components: [resultContainer(theme, botAvatar, '🗑️ VIP Room Setup Cancelled', 'The preview channels have been removed. No changes were saved.')],
        flags: MessageFlags.IsComponentsV2,
    });
}

export async function handleVipCreateModal(interaction, client) {
    if (!isOwnerOrDev(interaction, client)) {
        return interaction.reply({ content: '> 🚫 Only the server owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild;
    const theme = await client.themeManager.getTheme(guild.id);
    const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 512 });

    const config = await GuildConfig.findOne({ guildId: guild.id });
    const vipConfig = config?.vipRoomConfig;
    if (!vipConfig?.enabled) {
        return interaction.editReply({ content: '> ⚠️ Run `/vip-setup` first to configure the VIP Room system.' });
    }

    const rawUser = interaction.fields.getTextInputValue('vip_target_user');
    const voiceName = interaction.fields.getTextInputValue('vip_voice_name').slice(0, 90);
    const chatNameRaw = interaction.fields.getTextInputValue('vip_chat_name').slice(0, 90);

    const targetId = parseUserId(rawUser);
    if (!targetId) {
        return interaction.editReply({ content: '> ⚠️ Invalid member ID or mention.' });
    }

    const targetMember = await guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
        return interaction.editReply({ content: '> ⚠️ Could not find that member in this server.' });
    }

    try {
        const role = await guild.roles.create({
            name: `👑 ${voiceName}`.slice(0, 100),
            mentionable: false,
            reason: `VIP room role for ${targetMember.user.tag}`,
        });

        const voiceChannel = await guild.channels.create({
            name: `👑 ${voiceName}`.slice(0, 100),
            type: ChannelType.GuildVoice,
            parent: vipConfig.voiceCategoryId || null,
            permissionOverwrites: [
                { id: guild.id, deny: ['ViewChannel', 'Connect'] },
                { id: role.id, allow: ['ViewChannel', 'Connect', 'Speak', 'Stream'] },
                { id: targetId, allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'ManageChannels'] },
            ],
        });

        const chatSlug = chatNameRaw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'vip-room';
        const textChannel = await guild.channels.create({
            name: chatSlug,
            type: ChannelType.GuildText,
            parent: vipConfig.chatCategoryId || null,
            permissionOverwrites: [
                { id: guild.id, deny: ['ViewChannel'] },
                { id: role.id, allow: ['ViewChannel', 'SendMessages'] },
                { id: targetId, allow: ['ViewChannel', 'SendMessages', 'ManageMessages'] },
            ],
        });

        await targetMember.roles.add(role, 'VIP room owner').catch(() => {});

        await VipRoom.create({
            guildId: guild.id,
            ownerId: targetId,
            voiceChannelId: voiceChannel.id,
            textChannelId: textChannel.id,
            roleId: role.id,
            roomName: voiceName,
        });

        await textChannel.send(`<@${targetId}>`).catch(() => {});
        await textChannel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [resultContainer(theme, targetMember.user.displayAvatarURL({ dynamic: true }),
                '👑 Your VIP Room',
                `Welcome, <@${targetId}>! This room is exclusively yours.\n\n` +
                `> **Voice:** <#${voiceChannel.id}>\n` +
                `> **Chat:** <#${textChannel.id}>\n\n` +
                `Manage it with \`/viproom\`: kick, lock, unlock, permit, mute, unmute, limit, rename, transfer, hide.`)],
        }).catch(() => {});

        return interaction.editReply({
            components: [resultContainer(theme, botAvatar, '✅ VIP Room Created',
                `> **Owner:** <@${targetId}>\n` +
                `> **Voice:** <#${voiceChannel.id}>\n` +
                `> **Chat:** <#${textChannel.id}>\n` +
                `> **Role:** <@&${role.id}>`)],
            flags: MessageFlags.IsComponentsV2,
        });
    } catch (err) {
        console.error('[vip-create] Error:', err);
        return interaction.editReply({ content: '> ⚠️ Failed to create the VIP room. Check my permissions and try again.' });
    }
}
