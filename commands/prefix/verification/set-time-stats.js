import {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MessageFlags, ChannelSelectMenuBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ActionRowBuilder, ButtonStyle, ChannelType,
} from 'discord.js';
import GuildConfig from '../../../models/guildConfig.js';
import config from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

function parseDuration(input) {
    if (!input) return null;
    const m = String(input).trim().match(/^(\d+)([smh])$/i);
    if (!m) return null;
    const value = parseInt(m[1], 10);
    if (!Number.isFinite(value) || value <= 0) return null;
    const unit  = m[2].toLowerCase();
    const ms    = unit === 's' ? value * 1000 : unit === 'm' ? value * 60_000 : value * 3_600_000;
    return Math.max(1_000, Math.min(24 * 3_600_000, ms));
}

export default {
    name: 'set-time-stats',
    aliases: ['settimestats', 'sts', 'set-time-stat'],
    description: 'Set a channel and interval to auto-post server stats.',
    category: 'Verification',
    usage: '&set-time-stats',

    async execute(message, args, client) {
        if (!message.guild) return;
        const isOwner = OWNER_IDS.includes(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isAdmin && !isOwner) {
            const c = new ContainerBuilder().setAccentColor(0x7C3AED)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Permission Denied\nYou need **Administrator** permission.'));
            return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        let selectedChannel = null;
        let selectedInterval = null;

        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`sts-ch:${message.author.id}`)
            .setPlaceholder('Select a channel for auto-posting stats')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

        const timeSelect = new StringSelectMenuBuilder()
            .setCustomId(`sts-time:${message.author.id}`)
            .setPlaceholder('Select time interval')
            .addOptions([
                { label: '30 Seconds',  value: '30s',  description: 'Post stats every 30 seconds' },
                { label: '1 Minute',    value: '1m',   description: 'Post stats every minute' },
                { label: '5 Minutes',   value: '5m',   description: 'Post stats every 5 minutes' },
                { label: '10 Minutes',  value: '10m',  description: 'Post stats every 10 minutes' },
                { label: '30 Minutes',  value: '30m',  description: 'Post stats every 30 minutes' },
                { label: '1 Hour',      value: '1h',   description: 'Post stats every hour' },
                { label: '6 Hours',     value: '6h',   description: 'Post stats every 6 hours' },
                { label: '12 Hours',    value: '12h',  description: 'Post stats every 12 hours' },
            ]);

        const buildActions = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`sts-apply:${message.author.id}`).setStyle(ButtonStyle.Success).setLabel('Apply Settings'),
            new ButtonBuilder().setCustomId(`sts-reset:${message.author.id}`).setStyle(ButtonStyle.Secondary).setLabel('Reset'),
            new ButtonBuilder().setCustomId(`sts-cancel:${message.author.id}`).setStyle(ButtonStyle.Danger).setLabel('Cancel'),
        );

        const container = new ContainerBuilder()
            .setAccentColor(0x7C3AED)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '#  Auto Stats Setup\n\n' +
                '**How to use:**\n' +
                '1. Select a channel from the dropdown below\n' +
                '2. Choose a time interval\n' +
                '3. Click **Apply Settings** to activate\n\n' +
                'Use **Reset** to disable auto-posting or **Cancel** to close.'
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect))
            .addActionRowComponents(new ActionRowBuilder().addComponents(timeSelect))
            .addActionRowComponents(buildActions());

        const sent = await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

        const col = sent.createMessageComponentCollector({
            time: 5 * 60_000,
            filter: i => i.user.id === message.author.id,
        });

        col.on('collect', async i => {
            try {
                if (i.customId === `sts-ch:${message.author.id}`) {
                    selectedChannel = i.values[0];
                    await i.reply({ content: ` Channel selected: <#${selectedChannel}>`, flags: 64 });
                } else if (i.customId === `sts-time:${message.author.id}`) {
                    selectedInterval = i.values[0];
                    await i.reply({ content: ` Interval selected: **${selectedInterval}**`, flags: 64 });
                } else if (i.customId === `sts-cancel:${message.author.id}`) {
                    await i.update({ flags: MessageFlags.IsComponentsV2, components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('#  Cancelled'))] });
                    col.stop();
                } else if (i.customId === `sts-reset:${message.author.id}`) {
                    // Remove the existing statsAutoTimers runtime and DB config
                    const timers = client.statsAutoTimers;
                    if (timers?.has(message.guild.id)) {
                        try { clearInterval(timers.get(message.guild.id).interval); } catch {}
                        timers.delete(message.guild.id);
                    }
                    await GuildConfig.findOneAndUpdate({ guildId: message.guild.id }, { $unset: { statsAuto: '' } });
                    await i.reply({ content: ' Auto stats posting has been disabled.', flags: 64 });
                } else if (i.customId === `sts-apply:${message.author.id}`) {
                    if (!selectedChannel) return i.reply({ content: ' Please select a channel first.', flags: 64 });
                    if (!selectedInterval) return i.reply({ content: ' Please select a time interval first.', flags: 64 });

                    const ms = parseDuration(selectedInterval);
                    if (!ms) return i.reply({ content: ' Invalid interval.', flags: 64 });

                    await GuildConfig.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { $set: { statsAuto: { channelId: selectedChannel, interval: selectedInterval, intervalMs: ms } } },
                        { upsert: true }
                    );

                    await i.update({
                        flags: MessageFlags.IsComponentsV2,
                        components: [new ContainerBuilder().setAccentColor(0x7C3AED)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `#  Auto Stats Enabled\n\n` +
                                `**Channel:** <#${selectedChannel}>\n` +
                                `**Interval:** ${selectedInterval}\n\n` +
                                `Stats will be posted every **${selectedInterval}**. Use \`&disable-time-stats\` to stop.`
                            ))]
                    });
                    col.stop();
                }
            } catch (e) {
                try { if (!i.deferred && !i.replied) await i.deferUpdate(); } catch {}
            }
        });

        col.on('end', async (_, reason) => {
            if (reason === 'time') await sent.edit({ components: [] }).catch(() => {});
        });
    }
};
