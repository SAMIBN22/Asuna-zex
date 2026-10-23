import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js'

// Bot owners' IDs (Replace with your own)
const owners = ["685448398077165578"];

export default {
    name: "aboutus",
    description: "Sends an about us message for Tesla Dev",
    async execute(message, args) {
        // Check if the author is a bot owner
        if (!owners.includes(message.author.id)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription('-You do not have permission to use this command!')
            return message.reply({ embeds: [errorEmbed] });
        }

        try {
            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setThumbnail('https://cdn.discordapp.com/icons/1196770783314313307/c4bdb928b5e68b2279567d8fc67eb6d6.webp?size=512')
                .setTitle('**__Tesla Dev__**')
                .setDescription(`
Hi! Dear Members of **${message.guild.name}**, Welcome to **[Tesla Dev](https://discord.gg/62fyXAvWKh)**!
One of the Best Dev Servers That Provide Bots to Manage Your Community Easily.

What Makes **[Tesla](https://discord.gg/62fyXAvWKh)**Unique?

- **Best Quality Services**
- **Special Bots with Unique Features**
- **All Bots (Helper, Checker, OneTap, Clans, Music, Game Panel ,SelfRoles ,Apply …)**
- **Suitable Offers for Premium Services**

What Are You Waiting For? Join Us and Enjoy All the Features at **[Tesla Dev](https://discord.gg/62fyXAvWKh)**!
                `)
                .setFooter({ text: 'Powered by Tesla ! Tesla Team', iconURL: 'https://cdn.discordapp.com/avatars/1344766565387866163/d402f291d803b265def362a7cae0c044.webp?size=1024' });

            const button = new ButtonBuilder()
                .setLabel('Tesla Dev')
                .setURL('https://discord.gg/62fyXAvWKh') 
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder().addComponents(button);

            await message.delete();
            await message.channel.send('||@everyone @here||');
            await message.channel.send({ embeds: [embed], components: [row] });
            await message.channel.send('`-` **Join Us Here! :** || https://discord.gg/62fyXAvWKh ||');

        } catch (error) {
            console.error('Error sending the about us message:', error);
        }
    }
};
