import { ActivityType, ChannelType } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import colors from '../../utils/colors.js';
import { startVoiceTicker } from '../../lib/voiceTracker.js';
import { startStatsJob } from '../../jobs/statsJob.js';
import GuildConfig from '../../models/guildConfig.js';
import { applyNameplateToAllGuilds } from '../../lib/nameplate.js';
import { initVoteScheduler } from '../../handlers/voteHandler.js';
import { syncProjectEmojis } from '../../lib/projectEmojiSync.js';
import { cleanupLegacyTicketMessages } from '../../handlers/ticketHandler.js';

async function joinConfiguredVoiceChannels(client) {
    if (client.databaseReady !== true) return;

    try {
        const configs = await GuildConfig.find({ botJoinVoiceChannelId: { $ne: null } });
        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) continue;
            const channel = guild.channels.cache.get(config.botJoinVoiceChannelId);
            if (!channel || channel.type !== ChannelType.GuildVoice) continue;
            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true,
                });
                console.log(colors.success(`[VOICE] Joined configured voice channel "${channel.name}" in ${guild.name}`));
            } catch (err) {
                console.error(`[VOICE] Failed to join configured voice channel in ${guild.name}:`, err);
            }
        }
    } catch (err) {
        console.error('[VOICE] Failed to load configured join-on-ready voice channels:', err);
    }
}

export default {
    name: 'clientReady',
    once: true,
    async execute(client) {
        try { await client.user.fetch(); } catch {}
        console.log(colors.success(`[ONLINE] ${client.user.tag} is now online`));

        // Remove only the nickname left behind by the old branding setup.
        // This does not change the bot's actual Discord username.
        let legacyNicknamesRemoved = 0;
        for (const guild of client.guilds.cache.values()) {
            const selfMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
            if (selfMember?.nickname !== 'gg') continue;
            try {
                await selfMember.setNickname(null, 'Remove legacy branding nickname');
                legacyNicknamesRemoved++;
            } catch {
                // A missing Manage Nicknames permission must not stop the bot.
            }
        }
        if (legacyNicknamesRemoved > 0) {
            console.log(`[Branding] Removed the legacy "gg" nickname from ${legacyNicknamesRemoved} server(s).`);
        }

        // ── Professional profile presence ─────────────────────────────────────
        // Custom presence text is shown underneath the profile name in Discord.
        const profileText = 'Cipher — 密码者 | Zex/Sami | Prefix=&';
        const cycleStatus = () => {
            client.user.setPresence({
                status: 'online',
                activities: [{
                    name: 'Custom Status',
                    state: profileText,
                    type: ActivityType.Custom,
                }],
            });
        };
        cycleStatus();
        // Initialise the Riffy Lavalink client now that we have a user ID.
        // Must run before autoDeploy (which can block on the Discord API).
        if (client.riffy) {
            try {
                client.riffy.init(client.user.id);
                console.log('[Music] Riffy node connection initiated.');
            } catch (err) {
                console.error('[Music] Riffy init error:', err.message);
            }
        }
        // Deploy slash commands — fire-and-forget so it never blocks anything else.
        if (client.loader && client.loader.getHandler('commands')) {
            client.loader.getHandler('commands').autoDeploy().catch(err =>
                console.error('[Deploy] autoDeploy error:', err.message)
            );
        }
        startVoiceTicker(client);
        startStatsJob(client);
        joinConfiguredVoiceChannels(client);
        applyNameplateToAllGuilds(client).catch(() => {});
        cleanupLegacyTicketMessages(client).catch(error => {
            console.error('[TicketBranding] Cleanup failed:', error.message);
        });

        if (
            client.config.autoImportProjectEmojis &&
            process.env.AUTO_IMPORT_PROJECT_EMOJIS === 'true' &&
            client.config.guildId
        ) {
            const emojiGuild = client.guilds.cache.get(client.config.guildId);
            syncProjectEmojis(emojiGuild, { logger: console }).catch((error) => {
                console.error('[EmojiSync] Automatic sync failed:', error.message);
            });
        }
    },
};
