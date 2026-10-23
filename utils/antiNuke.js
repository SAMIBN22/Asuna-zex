import { PermissionsBitField } from 'discord.js';

const modTracker = new Map();

const getTracker = (guildId, userId, type) => {
    const key = `${guildId}-${userId}-${type}`;
    if (!modTracker.has(key)) {
        modTracker.set(key, []);
    }
    return modTracker.get(key);
};

export const checkAntiNukeLimit = async (client, guild, executor, settings, type) => {
    if (!executor || executor.bot) return false;

    const limitKey = `anti${type}Limit`;
    const actionKey = `anti${type}Action`;
    
    const maxViolations = settings[limitKey] || 3;
    const windowMs = (type === 'Mute' || type === 'Move') ? 3600000 : 60000; 
    
    const tracker = getTracker(guild.id, executor.id, type);
    const now = Date.now();

    while (tracker.length > 0 && now - tracker[0] > windowMs) {
        tracker.shift();
    }
    
    tracker.push(now);
    
    if (tracker.length > maxViolations) {

        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (!member) return false;
        const whitelistedRoles = settings.whitelistedRoles || [];
        const whitelistedUsers = settings.whitelistedUsers || [];
        
        if (whitelistedUsers.includes(member.id)) return false;
        if (member.roles.cache.some(role => whitelistedRoles.includes(role.id))) return false;
        const action = settings[actionKey] || 'ban';
        
        if (action !== 'none') {
            const timeWindowStr = (type === 'Mute' || type === 'Move') ? 'hour' : 'minute';
            const securityHandler = (await import('./securityHandler.js')).default;
            const result = await securityHandler.punish(
                client, 
                member, 
                action, 
                `Anti-Nuke Protection: Exceeded ${type} limit of ${maxViolations} actions per ${timeWindowStr}`, 
                settings
            );

            tracker.length = 0;
            return true; 
        }
    }
    return false; 
};
