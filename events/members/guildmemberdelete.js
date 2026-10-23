import { Events, ContainerBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import GuildConfig from '../../models/guildConfig.js';
import WebhookLogger from '../../functions/webhookLogger.js';

export default {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        if (!member.guild) return;

        try {
            const settings = await GuildConfig.findOne({ guildId: member.guild.id });
            if (!settings?.leaveLogChannel) return;

            const logChannel = member.guild.channels.cache.get(settings.leaveLogChannel);
            if (!logChannel) return;

            const memberInfo = `## <a:15218346115192628311:1522708751495335996> **__Member Left__**\n` +
                `> <a:15278182396090124351:1528064846267158558> **Member:** ${member.user.tag}\n` +
                `> <a:15278182396090124351:1528064846267158558> **Left at:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                `> <a:15278182396090124351:1528064846267158558> **Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                `> <a:15278182396090124351:1528064846267158558> **Joined at:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n` +
                `> <a:15278182396090124351:1528064846267158558> **Roles:** ${member.roles.cache.size - 1}`;

            const container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(text => text.setContent(memberInfo))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addSectionComponents(section =>
                    section.setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true })))
                );

            await logChannel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            const webhookLogger = new WebhookLogger(client);
            await webhookLogger.logError('Member Leave Error', error, member.guild.id);
        }
    }
};
