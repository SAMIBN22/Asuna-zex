import { Events, AuditLogEvent, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { sendLog, div, ts, COLORS, footer } from '../../lib/logSender.js';

export default {
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild, client) {
        const changes = [];

        if (oldGuild.name !== newGuild.name)
            changes.push(`> 📌 **Name:** \`${oldGuild.name}\` → \`${newGuild.name}\``);
        if (oldGuild.icon !== newGuild.icon)
            changes.push(`> 🖼️ **Icon:** Updated`);
        if (oldGuild.splash !== newGuild.splash)
            changes.push(`> 🌊 **Splash:** Updated`);
        if (oldGuild.banner !== newGuild.banner)
            changes.push(`> 🎨 **Banner:** Updated`);
        if (oldGuild.description !== newGuild.description)
            changes.push(`> 📝 **Description:** Updated`);
        if (oldGuild.verificationLevel !== newGuild.verificationLevel)
            changes.push(`> 🔐 **Verification Level:** \`${oldGuild.verificationLevel}\` → \`${newGuild.verificationLevel}\``);
        if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter)
            changes.push(`> 🛡️ **Content Filter:** Updated`);
        if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications)
            changes.push(`> 🔔 **Default Notifications:** Updated`);

        if (changes.length === 0) return;

        await new Promise(r => setTimeout(r, 1500));
        let updatedBy = null;
        try {
            const logs  = await newGuild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.GuildUpdate });
            const entry = logs.entries.first();
            if (entry && (Date.now() - entry.createdTimestamp) < 5000) {
                updatedBy = entry.executor;
            }
        } catch { /* */ }

        await sendLog(client, newGuild, 'serverUpdate', (accent, theme) => {
            const star = theme.emojis?.star || '⭐';
            const icon = newGuild.iconURL({ extension: 'png', size: 256 });

            const c = new ContainerBuilder()
                .setAccentColor(COLORS.purple)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⚙️ __Server Updated__`))
                .addSeparatorComponents(div(true));

            const infoSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${star} **Updated By:** ${updatedBy ? `<@${updatedBy.id}>` : '`Unknown`'}\n` +
                    `${star} **At:** ${ts()}\n\n` +
                    `**Changes:**\n${changes.join('\n')}`
                ));

            if (icon) {
                infoSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(icon));
            } else {
                infoSection.addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200b'));
            }

            c.addSectionComponents(infoSection)
                .addSeparatorComponents(div(true))
                .addTextDisplayComponents(footer(newGuild));

            return c;
        });
    },
};
