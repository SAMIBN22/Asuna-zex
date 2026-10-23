import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} from 'discord.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERMS_FILE = path.join(__dirname, '../../db/voicePermissions.json');

function loadPerms() {
    try { if (fs.existsSync(PERMS_FILE)) return JSON.parse(fs.readFileSync(PERMS_FILE, 'utf8')); }
    catch (e) {}
    return {};
}

function savePerms(data) {
    try { fs.writeFileSync(PERMS_FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('[VoicePanel] Error saving perms:', e); }
}

function getAllowed(guildId) {
    const data = loadPerms();
    return data[guildId] || [];
}

export default {
    name: 'voice-panel',
    aliases: ['vpanel', 'voicepanel', 'vc-panel'],
    description: 'Manage who can use private voice commands (Server Owner only)',
    usage: '-voice-panel',
    category: 'Private Voice',
    permissions: null,

    async execute(message, args) {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply({ content: ' Only the **server owner** can use this command.' });
        }

        const uid   = message.id;
        const guild = message.guild;
        const now   = Math.floor(Date.now() / 1000);

        async function buildPanel(statusLine) {
            const allowed = getAllowed(guild.id);
            let allowedText = 'No users added yet.';
            if (allowed.length > 0) {
                allowedText = allowed.map((id, i) => `\`${i + 1}.\` <@${id}>`).join('\n');
            }

            return new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `##  Private Voice — Permission Panel\n` +
                                `Only users added here can use \`-set-voice-category\` and \`-create-voice\`.\n\n` +
                                `** Allowed Users (${allowed.length}):**\n` +
                                allowedText +
                                (statusLine ? `\n\n> ${statusLine}` : '')
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 256 }))
                        )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`vp_add_${uid}`)
                            .setLabel('Add Permission')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`vp_list_${uid}`)
                            .setLabel('List Users')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`vp_remove_${uid}`)
                            .setLabel('Remove Permission')
                            .setStyle(ButtonStyle.Danger)
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Voice Permission System • ${guild.name} • <t:${now}:F>`)
                );
        }

        const panel = await message.reply({
            components: [await buildPanel(null)],
            flags: [MessageFlags.IsComponentsV2]
        });

        const collector = panel.createMessageComponentCollector({
            filter: i => {
                if (i.user.id !== guild.ownerId) {
                    i.reply({ content: ' Only the **server owner** can use this panel.', ephemeral: true });
                    return false;
                }
                return [`vp_add_${uid}`, `vp_list_${uid}`, `vp_remove_${uid}`].includes(i.customId);
            },
            time: 300_000
        });

        collector.on('collect', async interaction => {

            /* ── ADD PERMISSION ── */
            if (interaction.customId === `vp_add_${uid}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`vp_modal_add_${uid}`)
                    .setTitle('Add Voice Permission')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('User Discord ID')
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
                    filter: i => i.customId === `vp_modal_add_${uid}` && i.user.id === guild.ownerId
                }).catch(() => null);

                if (!submit) return;

                const userId = submit.fields.getTextInputValue('user_id').trim();

                if (!/^\d{17,19}$/.test(userId)) {
                    await submit.reply({ content: ' Invalid Discord ID! Must be 17–19 digits.', ephemeral: true });
                    return;
                }

                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member) {
                    await submit.reply({ content: ' User not found in this server.', ephemeral: true });
                    return;
                }

                const data    = loadPerms();
                const allowed = data[guild.id] || [];

                if (allowed.includes(userId)) {
                    await submit.reply({ content: ` **${member.displayName}** already has permission.`, ephemeral: true });
                    return;
                }

                allowed.push(userId);
                data[guild.id] = allowed;
                savePerms(data);

                await submit.reply({ content: ` **${member.displayName}** can now use \`-set-voice-category\` and \`-create-voice\`.`, ephemeral: true });
                await panel.edit({ components: [await buildPanel(` Added ${member.displayName}`)], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            }

            /* ── LIST USERS ── */
            else if (interaction.customId === `vp_list_${uid}`) {
                const allowed = getAllowed(guild.id);

                if (allowed.length === 0) {
                    await interaction.reply({ content: ' No users have voice permissions yet.', ephemeral: true });
                    return;
                }

                const lines = await Promise.all(
                    allowed.map(async (id, i) => {
                        const m = await guild.members.fetch(id).catch(() => null);
                        const name = m ? m.displayName : `Unknown (${id})`;
                        return `\`${i + 1}.\` **${name}** — \`${id}\``;
                    })
                );

                await interaction.reply({
                    content: ` **Users with voice permissions (${allowed.length}):**\n${lines.join('\n')}`,
                    ephemeral: true
                });
            }

            /* ── REMOVE PERMISSION ── */
            else if (interaction.customId === `vp_remove_${uid}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`vp_modal_remove_${uid}`)
                    .setTitle('Remove Voice Permission')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('User Discord ID to Remove')
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
                    filter: i => i.customId === `vp_modal_remove_${uid}` && i.user.id === guild.ownerId
                }).catch(() => null);

                if (!submit) return;

                const userId = submit.fields.getTextInputValue('user_id').trim();
                const data   = loadPerms();
                const allowed = data[guild.id] || [];

                if (!allowed.includes(userId)) {
                    await submit.reply({ content: ' This user does not have voice permission.', ephemeral: true });
                    return;
                }

                data[guild.id] = allowed.filter(id => id !== userId);
                savePerms(data);

                const member = await guild.members.fetch(userId).catch(() => null);
                const name   = member ? member.displayName : userId;

                await submit.reply({ content: ` Removed permission for **${name}**.`, ephemeral: true });
                await panel.edit({ components: [await buildPanel(` Removed ${name}`)], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time') {
                await panel.edit({
                    components: [await buildPanel(' Panel expired. Run `-voice-panel` again.')],
                    flags: [MessageFlags.IsComponentsV2]
                }).catch(() => {});
            }
        });
    }
};
