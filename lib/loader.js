import AntiCrashSystem from '../functions/anticrash.js';
import ThemeLoader from './themeloader.js';
import FileReloader from '../functions/reload.js';
import NoPrefixHandler from '../handlers/noPrefixHandler.js';
import CommandsHandler from '../handlers/commandHandler.js';
import EventsHandler from '../handlers/eventsHandler.js';
import FunctionsHandler from '../handlers/functionsHandler.js';

import themeManager from '../themes/themeManager.js';

class Loader {
    constructor(client) {
        this.client = client;
        this.themeManager = themeManager;
        this.handlers = {
            anticrash: null,
            themes: null,
            reloader: null,
            noPrefix: null,
            commands: null,
            events: null,
            functions: null
        };
        this.isLoaded = false;
    }

    async loadAll() {
        try {
            this.handlers.anticrash = new AntiCrashSystem(this.client);
            this.handlers.themes = new ThemeLoader(this.client);
            this.handlers.reloader = new FileReloader(this.client);
            this.handlers.noPrefix = new NoPrefixHandler(this.client);
            this.handlers.commands = new CommandsHandler(this.client);
            this.handlers.events = new EventsHandler(this.client);
            this.handlers.functions = new FunctionsHandler(this.client);

            await this.handlers.themes.loadThemes();
            this.handlers.reloader.init();
            this.handlers.noPrefix.init();
            await this.handlers.commands.loadAll();
            await this.handlers.events.loadAll();
            await this.handlers.functions.loadAll();
            await this.handlers.functions.initializeFunctions();

            this.client.themeManager = this.themeManager;
            this.client.themes = this.handlers.themes.themes;
            this.client.noPrefixHandler = this.handlers.noPrefix;
            this.client.prefixCommands = this.handlers.commands.prefixCommands;
            this.client.slashCommands = this.handlers.commands.slashCommands;
            this.client.events = this.handlers.events.events;
            this.client.functions = this.handlers.functions.functions;
            this.client.loader = this;

            this.isLoaded = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    getHandler(name) {
        return this.handlers[name] || null;
    }

    getAllHandlers() {
        return this.handlers;
    }

    getStats() {
        return {
            loaded: this.isLoaded,
            handlers: {
                anticrash: !!this.handlers.anticrash,
                themes: !!this.handlers.themes,
                reloader: !!this.handlers.reloader,
                noPrefix: !!this.handlers.noPrefix,
                commands: !!this.handlers.commands,
                events: !!this.handlers.events,
                functions: !!this.handlers.functions
            }
        };
    }

    async destroy() {
        this.isLoaded = false;
    }
}

export default Loader;
