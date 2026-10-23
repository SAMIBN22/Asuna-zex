import { Collection } from 'discord.js';
import GuildConfig from '../models/guildConfig.js';

class SettingsManager {
    constructor(client) {
        this.client = client;
        this.cache = new Collection();
        this.pendingRequests = new Map();
    }

    async getSettings(guildId) {
        if (!guildId) return null;

        // The bot can still serve Discord commands without persistence. Avoid
        // making every message wait on an unavailable optional database.
        if (this.client.databaseReady !== true) {
            return {
                guildId,
                prefix: this.client.config?.prefix || '&',
                customAliases: {},
            };
        }
        
        // 1. Check persistent cache
        let settings = this.cache.get(guildId);
        if (settings) return settings;

        // 2. Prevent concurrent duplicate requests (Cache Stampede protection)
        if (this.pendingRequests.has(guildId)) {
            return await this.pendingRequests.get(guildId);
        }

        const fetchPromise = (async () => {
            try {
                let doc = await GuildConfig.findOne({ guildId }).lean();
                if (!doc) {
                    doc = await GuildConfig.create({ guildId });
                    doc = doc.toObject();
                }
                this.cache.set(guildId, doc);
                return doc;
            } finally {
                this.pendingRequests.delete(guildId);
            }
        })();

        this.pendingRequests.set(guildId, fetchPromise);
        return await fetchPromise;
    }

    async updateSettings(guildId, data) {
        if (this.client.databaseReady !== true) {
            return null;
        }

        const settings = await GuildConfig.findOneAndUpdate(
            { guildId },
            { $set: data, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        this.cache.set(guildId, settings);
        return settings;
    }

    async flush(guildId) {
        if (guildId) {
            this.cache.delete(guildId);
        } else {
            this.cache.clear();
        }
    }

    init() {
        // Optional: Pre-load settings for large guilds if needed
    }
}

export default SettingsManager;
