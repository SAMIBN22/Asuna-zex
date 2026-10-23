import { EmbedBuilder } from 'discord.js'

export default {
    name: "tax",
    description: "Calculate tax for a given amount",
    async execute(message, args) {
        const taxRate = 0.06; // 6% tax rate

        if (args.length < 1 || isNaN(args[0])) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setDescription("Please provide a valid number!");
            return message.reply({ embeds: [errorEmbed] });
        }

        const amount = parseFloat(args[0]);
        const tax = amount * taxRate;
        const total = amount + tax;

        const embed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setAuthor({ name: 'Tax Calculation', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`**Amount:** ${amount}\n**Tax (6%):** ${tax.toFixed(2)}\n**Total (with tax):** ${total.toFixed(2)}`)
            .setFooter({ text: "Tax Calculator Bot", iconURL: message.guild.iconURL({ dynamic: true }) });

        return message.reply({ embeds: [embed] });
    }
};
