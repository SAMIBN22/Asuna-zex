import { Collection } from 'discord.js';
import constants from '../config/constant.js';

class CooldownManager {
    constructor(client) {
        this.client = client;
        this.cooldowns = new Collection();
        this.globalCooldowns = new Collection();
        this.userCooldowns = new Collection();
        this.guildCooldowns = new Collection();
        this.defaultCooldowns = constants.COOLDOWNS.DEFAULT;
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    setCooldown(type, id, command, duration = null) {
        const key = `${command}-${id}`;

        if (!duration) {
            duration = this.getCommandCooldown(command, type);
        }

        const expires = Date.now() + duration;

        switch (type) {
            case 'user':
                this.userCooldowns.set(key, expires);
                break;
            case 'guild':
                this.guildCooldowns.set(key, expires);
                break;
            case 'global':
                this.globalCooldowns.set(key, expires);
                break;
            default:
                this.cooldowns.set(key, expires);
        }
    }

    getCommandCooldown(command, type) {
        const commandCooldown = constants.COOLDOWNS.COMMANDS[command.toUpperCase()];
        if (commandCooldown !== undefined) {
            return commandCooldown;
        }
        return this.defaultCooldowns[type.toUpperCase()] || this.defaultCooldowns.USER;
    }

    getCooldown(type, id, command) {
        const key = `${command}-${id}`;
        let cooldown;

        switch (type) {
            case 'user':
                cooldown = this.userCooldowns.get(key);
                break;
            case 'guild':
                cooldown = this.guildCooldowns.get(key);
                break;
            case 'global':
                cooldown = this.globalCooldowns.get(key);
                break;
            default:
                cooldown = this.cooldowns.get(key);
        }

        if (!cooldown) return null;

        const remaining = cooldown - Date.now();
        return remaining > 0 ? remaining : null;
    }

    isOnCooldown(type, id, command) {
        return this.getCooldown(type, id, command) !== null;
    }

    getRemainingTime(type, id, command) {
        return this.getCooldown(type, id, command);
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    checkCooldown(type, id, command) {
        const remaining = this.getRemainingTime(type, id, command);
        if (remaining) {
            return {
                onCooldown: true,
                remaining: remaining,
                formatted: this.formatTime(remaining)
            };
        }
        return { onCooldown: false };
    }

    cleanup() {
        const now = Date.now();

        for (const [key, expires] of this.cooldowns) {
            if (expires <= now) {
                this.cooldowns.delete(key);
            }
        }

        for (const [key, expires] of this.userCooldowns) {
            if (expires <= now) {
                this.userCooldowns.delete(key);
            }
        }

        for (const [key, expires] of this.guildCooldowns) {
            if (expires <= now) {
                this.guildCooldowns.delete(key);
            }
        }

        for (const [key, expires] of this.globalCooldowns) {
            if (expires <= now) {
                this.globalCooldowns.delete(key);
            }
        }
    }

    clearCooldown(type, id, command) {
        const key = `${command}-${id}`;

        switch (type) {
            case 'user':
                this.userCooldowns.delete(key);
                break;
            case 'guild':
                this.guildCooldowns.delete(key);
                break;
            case 'global':
                this.globalCooldowns.delete(key);
                break;
            default:
                this.cooldowns.delete(key);
        }
    }

    clearAllCooldowns(type, id) {
        switch (type) {
            case 'user':
                for (const [key] of this.userCooldowns) {
                    if (key.endsWith(`-${id}`)) {
                        this.userCooldowns.delete(key);
                    }
                }
                break;
            case 'guild':
                for (const [key] of this.guildCooldowns) {
                    if (key.endsWith(`-${id}`)) {
                        this.guildCooldowns.delete(key);
                    }
                }
                break;
            case 'global':
                for (const [key] of this.globalCooldowns) {
                    if (key.endsWith(`-${id}`)) {
                        this.globalCooldowns.delete(key);
                    }
                }
                break;
            default:
                for (const [key] of this.cooldowns) {
                    if (key.endsWith(`-${id}`)) {
                        this.cooldowns.delete(key);
                    }
                }
        }
    }

    getStats() {
        return {
            total: this.cooldowns.size,
            user: this.userCooldowns.size,
            guild: this.guildCooldowns.size,
            global: this.globalCooldowns.size
        };
    }

    clear() {
        this.cooldowns.clear();
        this.userCooldowns.clear();
        this.guildCooldowns.clear();
        this.globalCooldowns.clear();
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.clear();
    }
}

export default CooldownManager;
