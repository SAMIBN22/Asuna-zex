import { Client, GatewayIntentBits, GatewayDispatchEvents, Partials, Collection } from 'discord.js';
import { SimpleShardingStrategy } from '@discordjs/ws';
import { Riffy }   from 'riffy';
import { Spotify } from 'riffy-spotify';
import mongoose from 'mongoose';
import config      from './config/config.js';
import musicConfig from './config/musicConfig.js';
import constants   from './config/constant.js';
import Loader          from './lib/loader.js';
import CooldownManager from './lib/cooldown.js';
import SettingsManager from './lib/settingsManager.js';
import ClanThemeLoader from './lib/clanThemeLoader.js';
import * as musicMsg   from './lib/musicMessages.js';

async function startBot() {
    if (!config.token) {
        throw new Error('DISCORD_TOKEN is not configured.');
    }

    // Do not let model operations queue for ten seconds when the optional
    // database is not configured or temporarily unavailable.
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferTimeoutMS', 0);

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildWebhooks,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildModeration,
        ],
        partials: [Partials.User, Partials.Channel, Partials.Message],
        ws: {
            buildStrategy: (manager) => {
                manager.options.identifyProperties = {
                    browser: 'Discord iOS',
                    os:      'iOS',
                    device:  'Discord iOS',
                };
                return new SimpleShardingStrategy(manager);
            },
        },
    });

    client.config    = config;
    client.constants = constants;
    client.prefixCommands = new Collection();
    client.slashCommands  = new Collection();
    client.events         = new Collection();
    client.functions      = new Collection();
    client.cooldowns      = new CooldownManager(client);
    client.settingsManager = new SettingsManager(client);
    new ClanThemeLoader(client).loadThemes();

    client.getSettings = async (guildId) =>
        await client.settingsManager.getSettings(guildId);

    client.saveSettings = async (guildId, key, value) =>
        await client.settingsManager.updateSettings(guildId, { [key]: value });

    // ── Music system (Riffy + Lavalink) ──────────────────────────────────────
    // Riffy must be attached to the client before login so it is available
    // inside command files via `client.riffy`.
    try {
        const spotifyEnabled =
            musicConfig.spotify.enabled &&
            musicConfig.spotify.clientId &&
            musicConfig.spotify.clientSecret;
        const spotify = spotifyEnabled ? new Spotify({
            clientId:     musicConfig.spotify.clientId,
            clientSecret: musicConfig.spotify.clientSecret,
        }) : null;

        client.riffy = new Riffy(client, musicConfig.nodes, {
            send: (payload) => {
                const guild = client.guilds.cache.get(payload.d.guild_id);
                if (guild) guild.shard.send(payload);
            },
            defaultSearchPlatform: 'ytmsearch',
            restVersion:           'v4',
            plugins:               spotify ? [spotify] : [],
        });

        // Riffy events (these are on client.riffy, not on client directly)
        client.riffy.on('nodeConnect', (node) => {
            console.log(`[Music] Node "${node.name}" connected.`);
        });

        client.riffy.on('nodeError', (node, error) => {
            console.error(`[Music] Node "${node.name}" error: ${error.message}`);
        });

        client.riffy.on('trackStart', async (player, track) => {
            const channel = client.channels.cache.get(player.textChannel);
            if (channel) musicMsg.nowPlaying(channel, track).catch(() => {});
        });

        client.riffy.on('queueEnd', async (player) => {
            const channel = client.channels.cache.get(player.textChannel);
            if (channel) musicMsg.queueEnded(channel).catch(() => {});
            player.destroy();
        });

        // Forward raw voice-state WebSocket packets to Riffy so it can
        // update internal voice connections.
        client.on('raw', (d) => {
            if (
                d.t === GatewayDispatchEvents.VoiceStateUpdate ||
                d.t === GatewayDispatchEvents.VoiceServerUpdate
            ) {
                client.riffy.updateVoiceState(d);
            }
        });

        console.log('[Music] Riffy music system initialised.');
    } catch (err) {
        console.error('[Music] Failed to initialise Riffy:', err.message);
        // Bot continues to run without music if Riffy fails to load.
    }

    // ── Load commands, events, functions ─────────────────────────────────────
    const loader = new Loader(client);
    if (config.mongoURI) {
        mongoose.connect(config.mongoURI, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
        }).then(async () => {
        client.databaseReady = true;
        // Drop stale legacy indexes left over from an older schema version.
        // The current Profile schema only defines a compound unique index on
        // { userId, guildId }. Older versions of the collection had separate
        // single-field unique indexes (e.g. "id_1", "userId_1") that block
        // valid documents today — e.g. "userId_1" alone prevents the same
        // user from having a profile in more than one guild. Any single-field
        // index left over from before is safe to drop since the schema no
        // longer relies on it.
        const KEEP_INDEXES = new Set(['_id_', 'userId_1_guildId_1']);
        try {
            const indexes = await mongoose.connection.collection('profiles').indexes();
            for (const idx of indexes) {
                if (KEEP_INDEXES.has(idx.name)) continue;
                await mongoose.connection.collection('profiles').dropIndex(idx.name);
                console.log(`[MongoDB] Dropped stale "${idx.name}" index on profiles collection.`);
            }
        } catch (err) {
            console.error('[MongoDB] Failed to check/drop stale indexes:', err.message);
        }

        // Drop stale legacy indexes from guildsetups collection.
        // An older schema version had a compound unique index on { guildId, channelId }
        // which blocks upserts when channelId is null (e.g. verify-record documents).
        // The current schema uses autoIndex: false and does not define this index.
        const KEEP_GUILDSETUP_INDEXES = new Set(['_id_']);
        try {
            const gsIndexes = await mongoose.connection.collection('guildsetups').indexes();
            for (const idx of gsIndexes) {
                if (KEEP_GUILDSETUP_INDEXES.has(idx.name)) continue;
                await mongoose.connection.collection('guildsetups').dropIndex(idx.name);
                console.log(`[MongoDB] Dropped stale "${idx.name}" index on guildsetups collection.`);
            }
        } catch (err) {
            // Collection may not exist yet — that is fine.
            if (err.codeName !== 'NamespaceNotFound') {
                console.error('[MongoDB] Failed to check/drop stale guildsetups indexes:', err.message);
            }
        }
        }).catch(err => {
            client.databaseReady = false;
            console.error('[MongoDB] Connection error:', err.message);
        });
    } else {
        client.databaseReady = false;
        console.warn('[MongoDB] Disabled: set MONGODB_URI to enable persistent settings.');
    }
    await loader.loadAll();

    client.login(config.token);
    return client;
}

const client = await startBot();
export default client;
