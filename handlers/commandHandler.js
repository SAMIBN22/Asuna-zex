import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection } from 'discord.js';
import colors from '../utils/colors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CommandsHandler {
    constructor(client) {
        this.client = client;
        this.prefixCommands = new Collection();
        this.slashCommands = new Collection();
        this.commandStats = { prefix: 0, slash: 0, categories: new Map() };
        this.deploymentStatus = { dev: false, global: false, lastDeploy: null };
    }

    async loadAll() {
        await this.loadCommands();
        this.logStats();
        return true;
    }

    async loadCommands() {
        await this.loadPrefixCommands();
        await this.loadSlashCommands();
    }

    async loadPrefixCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands', 'prefix');
        if (!fs.existsSync(commandsPath)) return;

        const categories = fs.readdirSync(commandsPath).filter(folder =>
            fs.statSync(path.join(commandsPath, folder)).isDirectory()
        );

        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const filePath = path.join(categoryPath, file);
                    const fileUrl = pathToFileURL(filePath).href;
                    const command = await import(`${fileUrl}?t=${Date.now()}`);

                    if (command.default && command.default.name) {
                        this.prefixCommands.set(command.default.name, command.default);
                        if (command.default.aliases) {
                            for (const alias of command.default.aliases) {
                                this.prefixCommands.set(alias, command.default);
                            }
                        }
                        this.commandStats.prefix++;
                    }
                } catch (error) {
                    console.error(colors.error(`[ERROR] Loading prefix command ${file}: ${error.message}`));
                }
            }
            this.commandStats.categories.set(category, commandFiles.length);
        }
    }

    async loadSlashCommands() {
        const slashPath = path.join(__dirname, '..', 'commands', 'slash');
        if (!fs.existsSync(slashPath)) return;

        const categories = fs.readdirSync(slashPath).filter(folder =>
            fs.statSync(path.join(slashPath, folder)).isDirectory()
        );

        for (const category of categories) {
            const categoryPath = path.join(slashPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const filePath = path.join(categoryPath, file);
                    const fileUrl = pathToFileURL(filePath).href;
                    const command = await import(`${fileUrl}?t=${Date.now()}`);

                    if (command.default && command.default.data) {
                        this.slashCommands.set(command.default.data.name, command.default);
                        this.commandStats.slash++;
                    }
                } catch (error) {
                    console.error(colors.error(`[ERROR] Loading slash command ${file}: ${error.message}`));
                }
            }
        }
    }

    async autoDeploy() {
        const isDev = process.env.NODE_ENV === 'development' || this.client.config?.guildId;

        if (isDev && this.client.config?.guildId) {
            await this.deployDev();
        } else {
            await this.deployGlobal();
        }
    }

    async deployDev() {
        if (!this.client.application || !this.client.config?.guildId) return false;

        try {
            const guild = this.client.guilds.cache.get(this.client.config.guildId);
            if (!guild) return false;

            await guild.commands.set([]);
            const commands = Array.from(this.slashCommands.values()).map(cmd => cmd.data.toJSON());
            await guild.commands.set(commands);

            this.deploymentStatus.dev = true;
            this.deploymentStatus.lastDeploy = new Date();
            console.log(colors.success(`[SUCCESS] Deployed ${this.slashCommands.size} commands to ${guild.name}`));
            return true;
        } catch (error) {
            console.error(colors.error(`[ERROR] Dev deployment failed: ${error.message}`));
            return false;
        }
    }

    async deployGlobal() {
        if (!this.client.application) return false;

        try {
            await this.client.application.commands.set([]);
            const commands = Array.from(this.slashCommands.values()).map(cmd => cmd.data.toJSON());
            await this.client.application.commands.set(commands);

            this.deploymentStatus.global = true;
            this.deploymentStatus.lastDeploy = new Date();
            console.log(colors.success(`[SUCCESS] Deployed ${this.slashCommands.size} commands globally`));
            return true;
        } catch (error) {
            console.error(colors.error(`[ERROR] Global deployment failed: ${error.message}`));
            return false;
        }
    }

    async clearAllCommands() {
        if (!this.client.application) return false;

        try {
            await this.client.application.commands.set([]);
            if (this.client.config?.guildId) {
                const guild = this.client.guilds.cache.get(this.client.config.guildId);
                if (guild) await guild.commands.set([]);
            }
            this.deploymentStatus.dev = false;
            this.deploymentStatus.global = false;
            console.log(colors.success(`[SUCCESS] All commands cleared`));
            return true;
        } catch (error) {
            console.error(colors.error(`[ERROR] Clear commands failed: ${error.message}`));
            return false;
        }
    }

    getPrefixCommand(name) {
        return this.prefixCommands.get(name);
    }

    getSlashCommand(name) {
        return this.slashCommands.get(name);
    }

    getAllPrefixCommands() {
        return this.prefixCommands;
    }

    getAllSlashCommands() {
        return this.slashCommands;
    }

    getCommandsByCategory(category) {
        const commands = [];
        for (const [name, command] of this.prefixCommands) {
            if (command.category === category) {
                commands.push({ name, command });
            }
        }
        return commands;
    }

    getStats() {
        return {
            total: this.commandStats.prefix + this.commandStats.slash,
            prefix: this.commandStats.prefix,
            slash: this.commandStats.slash,
            categories: Object.fromEntries(this.commandStats.categories),
            deployment: this.deploymentStatus
        };
    }

    getDeploymentStatus() {
        return {
            ...this.deploymentStatus,
            commandsLoaded: this.slashCommands.size,
            lastDeployFormatted: this.deploymentStatus.lastDeploy?.toISOString() || 'Never'
        };
    }

    reloadCommand(type, commandName) {
        if (type === 'prefix') {
            this.prefixCommands.delete(commandName);
        } else if (type === 'slash') {
            this.slashCommands.delete(commandName);
        }
    }

    validateCommand(command) {
        const required = ['name', 'execute'];
        const missing = required.filter(prop => !command[prop]);
        if (missing.length > 0) {
            throw new Error(`Command missing required properties: ${missing.join(', ')}`);
        }
        if (typeof command.execute !== 'function') {
            throw new Error('Command execute must be a function');
        }
        return true;
    }

    logStats() {
        console.log(colors.info(`[INFO] Commands: ${this.commandStats.prefix} prefix, ${this.commandStats.slash} slash`));
    }
    async registerSlashCommands() {
        return await this.deployGlobal();
    }

    async forceGlobalDeploy() {
        return await this.deployGlobal();
    }

    async forceDevDeploy() {
        return await this.deployDev();
    }

    async clearCommands(guildId = null) {
        if (guildId) {
            const guild = this.client.guilds.cache.get(guildId);
            if (guild) await guild.commands.set([]);
        } else {
            await this.client.application.commands.set([]);
        }
    }
}

export default CommandsHandler;