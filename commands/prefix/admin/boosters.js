import { EmbedBuilder } from 'discord.js'

const COOLDOWN_TIME = 30000;
const cooldowns = new Map();

const guildFetchLocks = new Map();

async function safeFetchBoosters(guild) {
    const cachedBoosters = guild.members.cache.filter(m => m.premiumSince);

    const looksComplete = guild.members.cache.size >= Math.min(guild.memberCount, 1000);
    if (looksComplete && cachedBoosters.size > 0) {
        return cachedBoosters;
    }

    if (guildFetchLocks.has(guild.id)) {
        return guild.members.cache.filter(m => m.premiumSince);
    }

    guildFetchLocks.set(guild.id, true);
    try {
        const members = await guild.members.fetch({ time: 30000 });
        return members.filter(m => m.premiumSince);
    } finally {
        setTimeout(() => guildFetchLocks.delete(guild.id), 25000);
    }
}

export default {
    name: 'boosters',
    description: 'A list of current boosters in the server.',
    async execute(message) {
        if (!message.member.permissions.has('Administrator')) {
            return;
        }

        if (cooldowns.has(message.author.id)) {
            return message.react('').catch(() => {});
        }

        cooldowns.set(message.author.id, Date.now() + COOLDOWN_TIME);
        setTimeout(() => cooldowns.delete(message.author.id), COOLDOWN_TIME);

        try {
            const boosters = await safeFetchBoosters(message.guild);

            if (!boosters || boosters.size === 0) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFFFFF')
                            .setDescription('There are currently no boosters in the server.')
                    ]
                });
            }

            const boosterList = boosters.map(member => `<@${member.user.id}>`).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FFFFFF')
                .setAuthor({ name: 'Current Boosters', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`**__Here are the current boosters in the server:__**\n${boosterList}`);

            return message.reply({ embeds: [embed] });

        } catch (error) {
            if (error?.name === 'GatewayRateLimitError' || error?.code === 'GatewayRateLimitError') {
                const retryAfter = Math.ceil(error?.data?.retry_after || 20);

                const cachedBoosters = message.guild.members.cache.filter(m => m.premiumSince);
                if (cachedBoosters.size > 0) {
                    const boosterList = cachedBoosters.map(m => `<@${m.user.id}>`).join('\n');
                    const embed = new EmbedBuilder()
                        .setColor('#FFFFFF')
                        .setAuthor({ name: 'Current Boosters (cached)', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(`**__Showing cached boosters (rate-limited, retry in ${retryAfter}s):__**\n${boosterList}`);
                    return message.reply({ embeds: [embed] });
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFFFFF')
                            .setDescription(`The server is currently rate-limited. Please try again in **${retryAfter} seconds**.`)
                    ]
                });
            }

            console.error('Error fetching boosters:', error);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FFFFFF')
                        .setDescription('An error occurred while fetching the boosters.')
                ]
            });
        }
    }
};
