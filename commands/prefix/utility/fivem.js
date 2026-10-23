import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'fivem',
    description: 'Get FiveM server information',
    category: 'Utility',
    usage: 'fivem <ip:port>',
    aliases: ['fvm', 'gta'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&fivem <ip:port>\`**\n> ${emojis.star || ''} **Example:** \`&fivem play.example.com:30120\``
                    ))]
            });
        }

        const loading = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().setAccentColor(accentColor)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.title || ''} __Fetching FiveM Server...__`))]
        });

        try {
            const address = args[0].replace(':', '%3A');
            const res = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${address}`);
            if (!res.ok) throw new Error('Server not found');
            const data = await res.json();
            const sv = data.Data;

            const name = sv.vars?.sv_projectName || sv.hostname || 'Unknown';
            const players = `${sv.clients}/${sv.svMaxclients}`;
            const gameMode = sv.vars?.gametype || 'N/A';
            const map = sv.mapname || 'N/A';
            const resources = sv.resources?.length || 0;
            const upvotes = sv.upvotePower || 0;
            const icon = sv.vars?.['sv_icon'] ? `https://servers-frontend.fivem.net/api/servers/icon/${address}/icon.png` : null;

            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __FiveM Server Info__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${name.slice(0, 80)}\n` +
                                    `> ${emojis.star || ''} **Players:** \`${players}\`\n` +
                                    `> ${emojis.star || ''} **Gamemode:** ${gameMode}\n` +
                                    `> ${emojis.star || ''} **Map:** ${map}\n` +
                                    `> ${emojis.star || ''} **Resources:** ${resources}\n` +
                                    `> ${emojis.star || ''} **Upvotes:** ${upvotes}\n` +
                                    `> ${emojis.star || ''} **Address:** \`${args[0]}\``
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(icon || client.user.displayAvatarURL()))
                        )
                ]
            });
        } catch {
            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Server Not Found__\n> ${emojis.star || ''} **Could not find server:** \`${args[0]}\`\n> ${emojis.star || ''} Make sure the server is online and the address is correct.`
                    ))]
            });
        }
    }
};
