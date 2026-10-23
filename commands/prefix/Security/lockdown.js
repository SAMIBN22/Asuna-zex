import {
    ContainerBuilder, TextDisplayBuilder,
    SeparatorBuilder, SeparatorSpacingSize,
    PermissionsBitField, MessageFlags
} from 'discord.js'

export default {
    name: 'lockdown',
    aliases: ['serverlock', 'emergency-lock'],
    description: 'Lock or unlock all text channels (emergency lockdown)',
    category: 'Security',

    async execute(message, args) {
        if (message.author.id !== message.guild.ownerId) return;

        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const c = new ContainerBuilder()
                .setAccentColor(0xED4245)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `##  Server Lockdown`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `Immediately lock or unlock **all text channels** in the server for \`@everyone\`.\n\n` +
                    `**Usage:**\n` +
                    `\`-lockdown on\` — Lock all channels (deny Send Messages for everyone)\n` +
                    `\`-lockdown off\` — Unlock all channels (restore Send Messages for everyone)\n\n` +
                    ` **Warning:** This affects all text channels at once.`
                ));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const isLocking = sub === 'on' || sub === 'lock' || sub === 'enable';
        const isUnlocking = sub === 'off' || sub === 'unlock' || sub === 'disable';

        if (!isLocking && !isUnlocking) {
            const c = new ContainerBuilder()
                .setAccentColor(0xFEE75C)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `##  Invalid Usage\nUse \`-lockdown on\` to lock or \`-lockdown off\` to unlock.`
                ));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const everyoneRole = message.guild.roles.everyone;
        const textChannels = message.guild.channels.cache.filter(
            ch => ch.isTextBased() && !ch.isThread() && !ch.isVoiceBased()
        );

        const statusMsg = await message.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0xFEE75C)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `##  Processing...\nApplying ${isLocking ? 'lockdown' : 'unlock'} to **${textChannels.size}** channels...`
                    ))
            ],
            flags: MessageFlags.IsComponentsV2
        });

        let success = 0;
        let failed  = 0;

        for (const [, channel] of textChannels) {
            try {
                if (isLocking) {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: false
                    }, { reason: `Server lockdown by ${message.author.tag}` });
                } else {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: null
                    }, { reason: `Lockdown lifted by ${message.author.tag}` });
                }
                success++;
            } catch {
                failed++;
            }
        }

        await statusMsg.edit({
            components: [
                new ContainerBuilder()
                    .setAccentColor(isLocking ? 0xED4245 : 0x57F287)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        isLocking
                            ? `##  Server Locked Down\n` +
                              `**${success}** channels locked — nobody can send messages.\n` +
                              (failed > 0 ? `-# ${failed} channels could not be modified (missing permissions).` : `-# Use \`-lockdown off\` to restore.`)
                            : `##  Lockdown Lifted\n` +
                              `**${success}** channels have been unlocked.\n` +
                              (failed > 0 ? `-# ${failed} channels could not be modified (missing permissions).` : `-# The server is back to normal.`)
                    ))
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
