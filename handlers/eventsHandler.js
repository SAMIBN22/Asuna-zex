import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EventsHandler {
    constructor(client) {
        this.client = client;
        this.events = new Map();
        this.eventStats = {
            total: 0,
            categories: new Map(),
            once: 0,
            on: 0
        };
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, '..', 'events');

        if (!fs.existsSync(eventsPath)) {
            console.warn('⚠️ Events directory not found');
            return;
        }

        const categories = fs.readdirSync(eventsPath).filter(folder =>
            fs.statSync(path.join(eventsPath, folder)).isDirectory()
        );

        for (const category of categories) {
            await this.loadEventCategory(category, path.join(eventsPath, category));
        }

        this.logStats();
    }

    async loadAll() {
        return await this.loadEvents();
    }

    async loadEventCategory(category, categoryPath) {
        const eventFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        let categoryCount = 0;

        for (const file of eventFiles) {
            try {
                const filePath = path.join(categoryPath, file);
                const fileUrl = pathToFileURL(filePath).href;
                const event = await import(`${fileUrl}?t=${Date.now()}`);

                if (event.default && event.default.name) {
                    const eventName = event.default.name;

                    this.registerEvent(event.default);
                    this.events.set(eventName, event.default);

                    categoryCount++;
                    this.eventStats.total++;

                    if (event.default.once) {
                        this.eventStats.once++;
                    } else {
                        this.eventStats.on++;
                    }
                }
            } catch (error) {
                console.error(`❌ Error loading event ${file}:`, error.message);
            }
        }

        this.eventStats.categories.set(category, categoryCount);
    }

    getEventName(category, fileName) {
        const baseName = path.basename(fileName, '.js');

        if (category === 'system') {
            return baseName;
        }

        return `${category}.${baseName}`;
    }

    registerEvent(event) {
        if (!event.name || !event.execute) {
            throw new Error('Event must have name and execute properties');
        }

        if (typeof event.execute !== 'function') {
            throw new Error('Event execute must be a function');
        }

        if (event.once) {
            this.client.once(event.name, (...args) => event.execute(...args, this.client));
        } else {
            this.client.on(event.name, (...args) => event.execute(...args, this.client));
        }
    }

    reloadEvent(eventName) {
        if (this.events.has(eventName)) {
            this.client.removeAllListeners(eventName);
            this.events.delete(eventName);
        }
    }

    getEvent(eventName) {
        return this.events.get(eventName);
    }

    getAllEvents() {
        return this.events;
    }

    getEventsByCategory(category) {
        const events = [];

        for (const [name, event] of this.events) {
            if (name.startsWith(`${category}.`)) {
                events.push({ name, event });
            }
        }

        return events;
    }

    validateEvent(event) {
        const required = ['name', 'execute'];
        const missing = required.filter(prop => !event[prop]);

        if (missing.length > 0) {
            throw new Error(`Event missing required properties: ${missing.join(', ')}`);
        }

        if (typeof event.execute !== 'function') {
            throw new Error('Event execute must be a function');
        }

        return true;
    }

    getStats() {
        return {
            total: this.eventStats.total,
            once: this.eventStats.once,
            on: this.eventStats.on,
            categories: Object.fromEntries(this.eventStats.categories)
        };
    }

    logStats() {
        // Stats logging disabled for clean output
    }

    async unloadAllEvents() {
        for (const [eventName] of this.events) {
            this.client.removeAllListeners(eventName);
        }
        this.events.clear();
    }

    async reloadAllEvents() {
        await this.unloadAllEvents();
        await this.loadEvents();
    }
}

export default EventsHandler;
