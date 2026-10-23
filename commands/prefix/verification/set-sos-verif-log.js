import {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder,
    SeparatorBuilder, MessageFlags, ChannelType,
    ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';

export default {
    name: 'set-sos-verif-log',
    description: 'Set the Sus-Verification log channel (Administrator only).',
    category: 'Verification',
    usage: '&set-sos-verif-log',

    async execute(message, args, client) {
        if (!message.guild) return;
        if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator))
            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [
                new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Permission Denied\nAdministrator permission required.'))
            ]});

        const all = message.guild.channels.cache
            .filter(ch => ch.viewable)
            .map(ch => ({ id: ch.id, name: ch.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (!all.length) return message.reply('No selectable channels found.');

        const pageSize   = 25;
        const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
        let page         = 1;
        let selectedId   = null;

        const buildRows = () => {
            const slice   = all.slice((page - 1) * pageSize, page * pageSize);
            const menu    = new StringSelectMenuBuilder()
                .setCustomId('svl-select')
                .setPlaceholder(`Select log channel (Page ${page}/${totalPages})`)
                .addOptions(slice.map(c => ({ label: c.name.slice(0, 100), value: c.id })));
            const nav = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('svl-prev').setStyle(ButtonStyle.Secondary).setLabel(' Prev').setDisabled(page <= 1),
                new ButtonBuilder().setCustomId('svl-next').setStyle(ButtonStyle.Primary).setLabel('Next ').setDisabled(page >= totalPages),
            );
            const actions = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('svl-save').setStyle(ButtonStyle.Success).setLabel('Save'),
                new ButtonBuilder().setCustomId('svl-delete').setStyle(ButtonStyle.Danger).setLabel('Delete'),
                new ButtonBuilder().setCustomId('svl-cancel').setStyle(ButtonStyle.Secondary).setLabel('Cancel'),
            );
            return [new ActionRowBuilder().addComponents(menu), nav, actions];
        };

        const container = () => new ContainerBuilder()
            .setAccentColor(0x7C3AED)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '#  Set Sus-Verification Log Channel\nSelect a channel from the dropdown then press **Save**.'
            ));

        const buildPayload = () => ({ flags: MessageFlags.IsComponentsV2, components: [container(), ...buildRows()] });
        const sent = await message.channel.send(buildPayload());

        const col = sent.createMessageComponentCollector({
            time: 5 * 60_000,
            filter: i => i.user.id === message.author.id,
        });

        col.on('collect', async i => {
            try {
                if (i.isStringSelectMenu()) {
                    selectedId = i.values[0];
                    await i.reply({ content: `Selected: <#${selectedId}>`, flags: 64 });
                    return;
                }
                if (i.customId === 'svl-prev') { page = Math.max(1, page - 1); await i.update(buildPayload()); }
                else if (i.customId === 'svl-next') { page = Math.min(totalPages, page + 1); await i.update(buildPayload()); }
                else if (i.customId === 'svl-cancel') {
                    await i.update({ flags: MessageFlags.IsComponentsV2, components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Cancelled\nNo changes were saved.'))] });
                    col.stop();
                } else if (i.customId === 'svl-delete') {
                    await GuildConfig.findOneAndUpdate({ guildId: message.guild.id }, { $unset: { 'susVerif.logChannelId': '' } }, { upsert: true });
                    await i.update({ flags: MessageFlags.IsComponentsV2, components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Log Channel Removed'))] });
                    col.stop();
                } else if (i.customId === 'svl-save') {
                    if (!selectedId) return i.reply({ content: 'Please select a channel first.', flags: 64 });
                    const ch = message.guild.channels.cache.get(selectedId);
                    if (!ch || (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement))
                        return i.reply({ content: 'Please select a text or announcement channel.', flags: 64 });
                    await GuildConfig.findOneAndUpdate({ guildId: message.guild.id }, { $set: { 'susVerif.logChannelId': selectedId } }, { upsert: true, returnDocument: 'after' });
                    await i.update({ flags: MessageFlags.IsComponentsV2, components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`#  Log Channel Set\nLogs will be sent to <#${selectedId}>.`))] });
                    col.stop();
                }
            } catch {}
        });

        col.on('end', async (_, reason) => {
            if (!['cancel', 'save', 'delete'].includes(reason))
                await sent.edit({ components: [] }).catch(() => {});
        });
    }
};
