// ─── Stats Auto-Post Job ───────────────────────────────────────────────────────
import GuildConfig from '../models/guildConfig.js';
import { postStatsPanel } from '../commands/prefix/stats/setstats.js';

const POST_INTERVAL  = 24 * 60 * 60 * 1000; // 24 hours
const CHECK_INTERVAL = 30 * 60 * 1000;       // check every 30 minutes

async function runStatsJob(client) {
    if (client.databaseReady !== true) return;

    try {
        const configs = await GuildConfig.find({
            'serverStatsConfig.enabled':   true,
            'serverStatsConfig.channelId': { $exists: true, $ne: null },
        }).lean();

        for (const config of configs) {
            try {
                const statsConfig = config.serverStatsConfig;
                const lastPosted  = statsConfig.lastPostedAt ? new Date(statsConfig.lastPostedAt) : null;
                const now         = new Date();

                if (lastPosted && (now - lastPosted) < POST_INTERVAL) continue;

                const guild = client.guilds.cache.get(config.guildId);
                if (!guild) continue;

                await postStatsPanel(guild, statsConfig, client);

                await GuildConfig.findOneAndUpdate(
                    { guildId: config.guildId },
                    { $set: { 'serverStatsConfig.lastPostedAt': now } },
                    { strict: false }
                );
            } catch (guildErr) {
                console.error(`[StatsJob] Error for guild ${config.guildId}:`, guildErr.message);
            }
        }
    } catch (err) {
        console.error('[StatsJob] Run error:', err.message);
    }
}

let _started = false; // guard — prevent duplicate intervals on reconnect

export function startStatsJob(client) {
    if (_started) return; // already running — do not create a second interval
    _started = true;

    // First run: wait 90 seconds after startup so guilds & channels are fully cached
    setTimeout(() => runStatsJob(client), 90_000);

    // Recurring check every 30 minutes
    setInterval(() => runStatsJob(client), CHECK_INTERVAL);

    console.log('[StatsJob] Auto-post job started — checks every 30 minutes');
}
