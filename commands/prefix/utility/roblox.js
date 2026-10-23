import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';

export default {
    name: 'roblox',
    description: 'Get Roblox user information by username or ID',
    category: 'Utility',
    usage: 'roblox <username or ID>',
    aliases: ['rbx'],
    async execute(message, args, client) {
        const theme = await client.themeManager.getTheme(message.guild.id);
        const accentColor = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis;

        if (!args[0]) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __Usage__\n> ${emojis.star || ''} **\`&roblox <username or ID>\`**`
                    ))]
            });
        }

        const loading = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [new ContainerBuilder().setAccentColor(accentColor)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.title || ''} __Fetching Roblox User...__`))]
        });

        try {
            let userId;
            const input = args[0];

            if (/^\d+$/.test(input)) {
                userId = input;
            } else {
                const searchRes = await fetch('https://users.roblox.com/v1/usernames/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usernames: [input], excludeBannedUsers: false })
                });
                const searchData = await searchRes.json();
                if (!searchData.data?.[0]) throw new Error('User not found');
                userId = searchData.data[0].id;
            }

            const [userRes, avatarRes] = await Promise.all([
                fetch(`https://users.roblox.com/v1/users/${userId}`),
                fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`)
            ]);

            const user = await userRes.json();
            if (!user.name) throw new Error('User not found');
            const avatarData = await avatarRes.json();
            const avatarUrl = avatarData.data?.[0]?.imageUrl;

            const created = user.created ? `<t:${Math.floor(new Date(user.created).getTime() / 1000)}:D>` : 'Unknown';
            const banned = user.isBanned ? ' Banned' : ' Active';
            const description = user.description?.slice(0, 150) || 'No description.';

            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${emojis.title || ''} __Roblox User Info__`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `## ${user.displayName} (@${user.name})\n` +
                                    `> ${emojis.star || ''} **ID:** \`${user.id}\`\n` +
                                    `> ${emojis.star || ''} **Status:** ${banned}\n` +
                                    `> ${emojis.star || ''} **Created:** ${created}\n` +
                                    `> ${emojis.star || ''} **Profile:** [View on Roblox](https://www.roblox.com/users/${user.id}/profile)`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl || client.user.displayAvatarURL()))
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${emojis.star || ''} __About__\n> ${description}`
                        ))
                ]
            });
        } catch {
            return loading.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().setAccentColor(accentColor)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${emojis.info || ''} __User Not Found__\n> ${emojis.star || ''} **No Roblox user found for:** \`${args[0]}\``
                    ))]
            });
        }
    }
};
