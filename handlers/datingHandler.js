/**
 * datingHandler.js
 * Handles all persistent 𝐀𝐬𝐮𝐧𝐚Cord dating panel interactions:
 *   - dating_my_profile        → ephemeral own-profile view
 *   - dating_post_profile      → post profile to gender channel
 *   - dating_thread            → post profile to thread channel
 *   - dating_create_profile    → open create modal
 *   - dating_update_profile    → open update modal (pre-filled)
 *   - dating_set_picture       → open picture-URL modal
 *   - dating_toggle_invites    → enable / disable incoming invites
 *   - dating_send_invite:uid   → DM an invite to the target user
 *   - dating_profile_modal     → save created / updated profile
 *   - dating_picture_modal     → save picture URL
 */

import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder,
} from 'discord.js';
import { buildTweetCard } from './tweetHandler.js';

import DatingProfile from '../models/datingProfile.js';
import DatingConfig  from '../models/datingConfig.js';

// ─── Gender icon helper ────────────────────────────────────────────────────────
function genderIcon(gender) {
    if (!gender) return '💬';
    const g = gender.toLowerCase();
    if (g === 'male')   return '♂️';
    if (g === 'female') return '♀️';
    return '⚧️';
}

// ─── Build: own profile panel (ephemeral) ─────────────────────────────────────
function buildOwnProfileContainer(profile, themeColor, user) {
    const name      = profile?.name      || 'Not defined';
    const age       = profile?.age       || 'Not defined';
    const gender    = profile?.gender    || 'Not defined';
    const intention = profile?.intention || 'Not defined';
    const bio       = profile?.bio       || '*No bio yet*';
    const picture   = profile?.picture   || null;
    const hasProfile = !!profile?.name;

    const content =
        `## 👤 __Your Profile__\n` +
        `> **@** __First Name:__ \`${name}\` ✨\n` +
        `> **𝕏** __Age:__ \`${age}\` ✨\n` +
        `> **${genderIcon(profile?.gender)}** __Gender:__ \`${gender}\` ✨\n` +
        `> **💬** __Intention:__ \`${intention}\` ✨\n` +
        `> **❤** __Bio__`;

    const bioText = bio;
    const avatar  = user.displayAvatarURL({ extension: 'png', size: 256 });

    const container = new ContainerBuilder().setAccentColor(themeColor);

    if (picture) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(picture))
        );
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    }

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(bioText))
        .addSeparatorComponents(new SeparatorBuilder());

    if (!hasProfile) {
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('dating_create_profile')
                    .setLabel('Create Profile')
                    .setStyle(ButtonStyle.Primary)
            )
        );
    } else {
        const inviteLabel = profile.invitesEnabled ? 'Disable Invites' : 'Enable Invites';
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('dating_update_profile')
                    .setLabel('Update')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dating_post_profile_own')
                    .setLabel('Post')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dating_set_picture')
                    .setLabel('Picture')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dating_toggle_invites')
                    .setLabel(inviteLabel)
                    .setStyle(profile.invitesEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
            )
        );
    }

    return container;
}

// ─── Build: other person's public profile panel ───────────────────────────────
function buildPublicProfileContainer(profile, member, themeColor, showInviteButton = true) {
    const name      = profile.name      || 'Not defined';
    const age       = profile.age       || 'Not defined';
    const gender    = profile.gender    || 'Not defined';
    const intention = profile.intention || 'Not defined';
    const bio       = profile.bio       || '*No bio yet*';
    const picture   = profile.picture   || member.user.displayAvatarURL({ extension: 'png', size: 256 });

    const content =
        `## 👤 __Profile__\n` +
        `> **@** __Name:__ \`${name}\` ✨\n` +
        `> **𝕏** __Age:__ \`${age}\` ✨\n` +
        `> **${genderIcon(profile.gender)}** __Gender:__ \`${gender}\` ✨\n` +
        `> **💬** __Intention:__ \`${intention}\` ✨\n` +
        `> **❤** __Bio__`;

    const container = new ContainerBuilder()
        .setAccentColor(themeColor)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(picture))
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(bio))
        .addSeparatorComponents(new SeparatorBuilder());

    if (showInviteButton && profile.invitesEnabled) {
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dating_send_invite:${profile.userId}`)
                    .setLabel('Send Invite')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✉️')
            )
        );
    } else if (!profile.invitesEnabled) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> *This user has disabled connection invites.*')
        );
    }

    return container;
}

// ─── Build profile modal (create or update) ───────────────────────────────────
function buildProfileModal(existing = null) {
    const modal = new ModalBuilder()
        .setCustomId('dating_profile_modal')
        .setTitle(existing ? 'Update Your Profile' : 'Create Your Profile');

    const nameInput = new TextInputBuilder()
        .setCustomId('dp_name')
        .setLabel('First Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Your first name or nickname')
        .setMaxLength(32)
        .setRequired(true);
    if (existing?.name) nameInput.setValue(existing.name);

    const ageInput = new TextInputBuilder()
        .setCustomId('dp_age')
        .setLabel('Age')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 22')
        .setMaxLength(10)
        .setRequired(true);
    if (existing?.age) ageInput.setValue(existing.age);

    const genderInput = new TextInputBuilder()
        .setCustomId('dp_gender')
        .setLabel('Gender')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Male / Female / Other')
        .setMaxLength(20)
        .setRequired(true);
    if (existing?.gender) genderInput.setValue(existing.gender);

    const intentionInput = new TextInputBuilder()
        .setCustomId('dp_intention')
        .setLabel('Intention')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Friendship / Dating / Relationship')
        .setMaxLength(30)
        .setRequired(true);
    if (existing?.intention) intentionInput.setValue(existing.intention);

    const bioInput = new TextInputBuilder()
        .setCustomId('dp_bio')
        .setLabel('Bio')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Write a short bio about yourself...')
        .setMaxLength(300)
        .setRequired(false);
    if (existing?.bio) bioInput.setValue(existing.bio);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(ageInput),
        new ActionRowBuilder().addComponents(genderInput),
        new ActionRowBuilder().addComponents(intentionInput),
        new ActionRowBuilder().addComponents(bioInput),
    );

    return modal;
}

// ─── Build picture modal ───────────────────────────────────────────────────────
function buildPictureModal(existing = null) {
    const modal = new ModalBuilder()
        .setCustomId('dating_picture_modal')
        .setTitle('Set Profile Picture');

    const urlInput = new TextInputBuilder()
        .setCustomId('dp_picture_url')
        .setLabel('Profile Picture URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/image.png')
        .setMaxLength(512)
        .setRequired(true);
    if (existing?.picture) urlInput.setValue(existing.picture);

    modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
    return modal;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function handleDatingInteraction(interaction, client) {
    const cid      = interaction.customId;
    const guildId  = interaction.guild?.id;
    const userId   = interaction.user.id;

    if (!guildId) return;

    const theme      = await client.themeManager.getTheme(guildId).catch(() => ({ color: 0x2b2d31, emojis: {} }));
    const themeColor = Number(theme.color) || 0x2b2d31;

    // ── My Profile button (from public panel) ──────────────────────────────────
    if (cid === 'dating_my_profile') {
        await interaction.deferReply({ ephemeral: true });
        const profile  = await DatingProfile.findOne({ userId, guildId });
        const member   = await interaction.guild.members.fetch(userId).catch(() => interaction.member);
        const container = buildOwnProfileContainer(profile, themeColor, interaction.user);
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    // ── Post Profile button (from public panel - quick post) ──────────────────
    if (cid === 'dating_post_profile') {
        await interaction.deferReply({ ephemeral: true });
        const profile = await DatingProfile.findOne({ userId, guildId });

        if (!profile?.name) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ⚠️ __No Profile Found__\n> You need to create a profile first.\n> Click **My Profile** → **Create Profile** to get started.`
                        ))
                ]
            });
        }

        const result = await postProfileToChannel(interaction, profile, client, themeColor, guildId);
        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(themeColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        result.ok
                            ? `## ✅ __Profile Posted!__\n> Your profile has been posted in <#${result.channelId}>.`
                            : `## ⚠️ __Post Failed__\n> ${result.reason}`
                    ))
            ]
        });
    }

    // ── Post Profile from own-profile panel ───────────────────────────────────
    if (cid === 'dating_post_profile_own') {
        await interaction.deferReply({ ephemeral: true });
        const profile = await DatingProfile.findOne({ userId, guildId });

        if (!profile?.name) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ⚠️ __No Profile Found__\n> Create a profile before posting.`
                        ))
                ]
            });
        }

        const result = await postProfileToChannel(interaction, profile, client, themeColor, guildId);
        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(themeColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        result.ok
                            ? `## ✅ __Profile Posted!__\n> Your profile has been shared in <#${result.channelId}>.`
                            : `## ⚠️ __Post Failed__\n> ${result.reason}`
                    ))
            ]
        });
    }

    // ── Thread button → show private compose panel (Dark / Light) ────────────
    if (cid === 'dating_thread') {
        return interaction.reply({
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder()
                    .setAccentColor(themeColor)
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `## 🧵 __Thread — Compose__\n\n` +
                                    `> Choose a card style, then write your message.\n` +
                                    `> It will be posted in this channel for everyone to see.`
                                )
                            )
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(
                                    interaction.guild.iconURL({ extension: 'png', size: 256 }) ||
                                    interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 })
                                )
                            )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('dating_thread_dark')
                                .setLabel('⬛  Dark')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('dating_thread_light')
                                .setLabel('⬜  Light')
                                .setStyle(ButtonStyle.Secondary),
                        )
                    ),
            ],
        });
    }

    // ── Thread Dark / Light compose buttons → open modal ─────────────────────
    if (cid === 'dating_thread_dark' || cid === 'dating_thread_light') {
        const mode = cid === 'dating_thread_dark' ? 'dark' : 'light';
        const modal = new ModalBuilder()
            .setCustomId(`dating_thread_modal_${mode}`)
            .setTitle(mode === 'dark' ? '⬛ Dark Thread Card' : '⬜ Light Thread Card')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('thread_text')
                        .setLabel('Your message')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Write anything you want to post in the channel...')
                        .setMinLength(1)
                        .setMaxLength(2000)
                        .setRequired(true)
                )
            );
        return interaction.showModal(modal);
    }

    // ── Create Profile button ─────────────────────────────────────────────────
    if (cid === 'dating_create_profile') {
        return interaction.showModal(buildProfileModal(null));
    }

    // ── Update Profile button ─────────────────────────────────────────────────
    if (cid === 'dating_update_profile') {
        const profile = await DatingProfile.findOne({ userId, guildId });
        return interaction.showModal(buildProfileModal(profile));
    }

    // ── Set Picture button ─────────────────────────────────────────────────────
    if (cid === 'dating_set_picture') {
        const profile = await DatingProfile.findOne({ userId, guildId });
        return interaction.showModal(buildPictureModal(profile));
    }

    // ── Toggle Invites button ─────────────────────────────────────────────────
    if (cid === 'dating_toggle_invites') {
        await interaction.deferUpdate();
        // Fetch first so we know the current state, then flip it
        const current = await DatingProfile.findOne({ userId, guildId });
        if (!current) return;
        const profile = await DatingProfile.findOneAndUpdate(
            { userId, guildId },
            { $set: { invitesEnabled: !current.invitesEnabled } },
            { returnDocument: 'after' }
        );
        if (!profile) return;
        const container = buildOwnProfileContainer(profile, themeColor, interaction.user);
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    // ── Send Invite button (dating_send_invite:targetUserId) ──────────────────
    if (cid.startsWith('dating_send_invite:')) {
        await interaction.deferReply({ ephemeral: true });
        const targetId = cid.split(':')[1];

        if (targetId === userId) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ⚠️ __Invalid Action__\n> You cannot send an invite to yourself.`
                        ))
                ]
            });
        }

        const targetProfile = await DatingProfile.findOne({ userId: targetId, guildId });
        if (!targetProfile?.invitesEnabled) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ⚠️ __Invites Disabled__\n> This user has disabled connection invites.`
                        ))
                ]
            });
        }

        // Get sender profile
        const senderProfile = await DatingProfile.findOne({ userId, guildId });

        // DM the target user
        try {
            const targetUser = await client.users.fetch(targetId);
            const senderMember = await interaction.guild.members.fetch(userId).catch(() => null);
            const senderPicture = senderProfile?.picture || senderMember?.user.displayAvatarURL({ extension: 'png' });

            const dmContainer = new ContainerBuilder().setAccentColor(themeColor)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ✉️ __New Connection Invite__\n` +
                            `> You received a connection invite from **${interaction.user.username}** on **${interaction.guild.name}**!\n\n` +
                            `> **@** __Name:__ \`${senderProfile?.name || 'Unknown'}\` ✨\n` +
                            `> **𝕏** __Age:__ \`${senderProfile?.age || 'Unknown'}\` ✨\n` +
                            `> **${genderIcon(senderProfile?.gender)}** __Gender:__ \`${senderProfile?.gender || 'Unknown'}\` ✨\n` +
                            `> **💬** __Intention:__ \`${senderProfile?.intention || 'Unknown'}\` ✨`
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(senderPicture))
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    senderProfile?.bio ? `❤ *${senderProfile.bio}*` : '*No bio provided.*'
                ));

            await targetUser.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
        } catch {
            // DMs disabled — post in guild channel as fallback
            const config  = await DatingConfig.findOne({ guildId });
            const channel = config?.panelChannelId
                ? interaction.guild.channels.cache.get(config.panelChannelId)
                : interaction.channel;

            if (channel?.isTextBased()) {
                await channel.send({ content: `<@${targetId}> — <@${userId}> sent you a connection invite! Check your DMs.` });
            }
        }

        return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(themeColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ✅ __Invite Sent!__\n> Your connection invite has been sent to <@${targetId}>.`
                    ))
            ]
        });
    }
}

// ─── Modal submission handler ─────────────────────────────────────────────────
export async function handleDatingModal(interaction, client) {
    const mcid     = interaction.customId;
    const guildId  = interaction.guild?.id;
    const userId   = interaction.user.id;

    if (!guildId) return;

    const theme      = await client.themeManager.getTheme(guildId).catch(() => ({ color: 0x2b2d31, emojis: {} }));
    const themeColor = Number(theme.color) || 0x2b2d31;

    // ── Profile modal (create or update) ──────────────────────────────────────
    if (mcid === 'dating_profile_modal') {
        await interaction.deferReply({ ephemeral: true });

        const name      = interaction.fields.getTextInputValue('dp_name').trim();
        const age       = interaction.fields.getTextInputValue('dp_age').trim();
        const gender    = interaction.fields.getTextInputValue('dp_gender').trim();
        const intention = interaction.fields.getTextInputValue('dp_intention').trim();
        const bio       = interaction.fields.getTextInputValue('dp_bio').trim();

        const profile = await DatingProfile.findOneAndUpdate(
            { userId, guildId },
            { $set: { name, age, gender, intention, bio } },
            { new: true, upsert: true }
        );

        const container = buildOwnProfileContainer(profile, themeColor, interaction.user);
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    // ── Picture modal ─────────────────────────────────────────────────────────
    if (mcid === 'dating_picture_modal') {
        await interaction.deferReply({ ephemeral: true });

        const url = interaction.fields.getTextInputValue('dp_picture_url').trim();

        // Basic URL validation
        const isValidUrl = /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url);
        if (!isValidUrl) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(themeColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ⚠️ __Invalid URL__\n> Please provide a direct image URL ending in \`.png\`, \`.jpg\`, \`.gif\`, or \`.webp\`.`
                        ))
                ]
            });
        }

        const profile = await DatingProfile.findOneAndUpdate(
            { userId, guildId },
            { $set: { picture: url } },
            { new: true, upsert: true }
        );

        const container = buildOwnProfileContainer(profile, themeColor, interaction.user);
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    // ── Thread card modals (dark / light) ─────────────────────────────────────
    if (mcid === 'dating_thread_modal_dark' || mcid === 'dating_thread_modal_light') {
        const mode   = mcid === 'dating_thread_modal_dark' ? 'dark' : 'light';
        const text   = interaction.fields.getTextInputValue('thread_text').trim();
        const member = interaction.member;
        const user   = interaction.user;
        const guild  = interaction.guild;

        if (!text) {
            return interaction.reply({
                flags:   MessageFlags.Ephemeral,
                content: '> ⚠️  Your message cannot be empty.',
            });
        }

        await interaction.deferReply({ ephemeral: true });

        // Resolve the configured thread channel from DatingConfig
        const datingCfg     = await DatingConfig.findOne({ guildId: guild.id });
        const threadChId    = datingCfg?.threadChannelId;
        const targetChannel = threadChId
            ? (guild.channels.cache.get(threadChId) || await guild.channels.fetch(threadChId).catch(() => null))
            : null;

        if (!targetChannel?.isTextBased()) {
            return interaction.editReply({
                content: '> ❌  No thread channel has been configured yet. Ask an admin to set one with `&setdating`.',
            });
        }

        try {
            const panelCh = interaction.channel;
            const png = await buildTweetCard({
                mode,
                avatarUrl:    user.displayAvatarURL({ extension: 'png', size: 128 }),
                guildIconUrl: guild.iconURL({ extension: 'png', size: 64 }),
                displayName:  member?.displayName || user.globalName || user.username,
                username:     user.username,
                content:      text,
                panelChName:  panelCh ? `#${panelCh.name}` : '#panel',
                tweetChName:  `#${targetChannel.name}`,
                showStats:    true,
                showVerified: true,
            });

            const attachment = new AttachmentBuilder(png, { name: 'thread.png' });
            await targetChannel.send({ files: [attachment], allowedMentions: { parse: [] } });

            return interaction.editReply({
                content: `> ✅  Your **${mode === 'dark' ? '⬛ Dark' : '⬜ Light'} Thread** card has been posted in <#${targetChannel.id}>.`,
            });
        } catch (err) {
            console.error(`[datingHandler] Thread card build failed:`, err.message);
            return interaction.editReply({
                content: `> ❌  Failed to generate the card: \`${err.message}\``,
            });
        }
    }
}

// ─── Post profile to gender channel ──────────────────────────────────────────
// Returns { ok: true, channelId } on success, or { ok: false, reason: string } on failure.
async function postProfileToChannel(interaction, profile, client, themeColor, guildId) {
    const config = await DatingConfig.findOne({ guildId });
    if (!config) return { ok: false, reason: 'The dating system has not been configured. Ask an admin to run `&setdating`.' };

    const gender    = (profile.gender || '').toLowerCase();
    const channelId = gender === 'female' ? config.femaleChannelId : config.maleChannelId;
    if (!channelId) {
        const missing = gender === 'female' ? 'Female Profiles Channel' : 'Male Profiles Channel';
        return { ok: false, reason: `The **${missing}** has not been set. Ask an admin to configure it.` };
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return { ok: false, reason: 'The configured profile channel is no longer accessible.' };

    const member = await interaction.guild.members.fetch(profile.userId).catch(() => null);
    if (!member) return { ok: false, reason: 'Could not fetch your member data.' };

    const container = buildPublicProfileContainer(profile, member, themeColor, true);
    const header    = new ContainerBuilder().setAccentColor(themeColor)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## 🌸 __New Profile — <@${profile.userId}>__`
        ));

    try {
        await channel.send({ flags: MessageFlags.IsComponentsV2, components: [header, container] });
        return { ok: true, channelId };
    } catch (err) {
        console.error('[DatingHandler] Failed to post profile to channel:', err);
        return { ok: false, reason: 'Failed to send the message to the channel. Check bot permissions.' };
    }
}
