import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'minecraft',
    description: 'Get information about a Java or Bedrock Minecraft server',
    category: 'Utility',
    usage: 'minecraft [bedrock] <address[:port]>',
    aliases: ['mc', 'mcserver'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n` +
                        `> ${emojis.star || ''} **Java:** \`&minecraft <address>\`\n` +
                        `> ${emojis.star || ''} **Bedrock:** \`&minecraft bedrock <address>\`\n` +
                        `> ${emojis.star || ''} **Example:** \`&minecraft hypixel.net\``
                    ))]
            });
        }

        let isBedrock = false;
        let address = args[0];
        if (args[0].toLowerCase() === 'bedrock') {
            isBedrock = true;
            address = args[1];
            if (!address) return message.reply({ content: '> Please provide a server address.' });
        }

        const loading = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().setAccentColor(accentColor)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.title || ''} __Fetching Minecraft Server...__`))]
        });

        try {
            const endpoint = isBedrock ? 'bedrock/3' : '3';
            const res = await fetch(`https://api.mcsrvstat.us/${endpoint}/${encodeURIComponent(address)}`);
            const data = await res.json();

            if (!data.online) {
                return loading.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.info || ''} __Server Offline__\n> ${emojis.star || ''} **${address}** is currently offline or unreachable.`
                        ))]
                });
            }

            const players = `${data.players?.online ?? 0}/${data.players?.max ?? 0}`;
            const version = data.version || 'Unknown';
            const motd = data.motd?.clean?.join(' ') || 'No MOTD';
            const icon = data.icon ? data.icon : null;
            const software = data.software || (isBedrock ? 'Bedrock' : 'Java');

            const playerList = data.players?.list?.slice(0, 10).map(p => `\`${p.name || p}\``).join(', ') || 'Hidden';

            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Minecraft Server Info__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${address}\n` +
                                    `> ${emojis.star || ''} **Status:**  Online\n` +
                                    `> ${emojis.star || ''} **Players:** \`${players}\`\n` +
                                    `> ${emojis.star || ''} **Version:** ${version}\n` +
                                    `> ${emojis.star || ''} **Software:** ${software}\n` +
                                    `> ${emojis.star || ''} **MOTD:** ${motd.slice(0, 100)}\n` +
                                    `> ${emojis.star || ''} **Type:** ${isBedrock ? 'Bedrock' : 'Java Edition'}`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(icon || client.user.displayAvatarURL()))
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} __Online Players__\n> ${playerList}`
                        ))
                ]
            });
        } catch {
            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Error__\n> ${emojis.star || ''} **Failed to fetch server data for:** \`${address}\``
                    ))]
            });
        }
    }
};
