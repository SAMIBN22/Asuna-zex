/**
 * resolveUser.js — Shared user/member resolution utility
 *
 * Accepts any of the following as `input`:
 *   • A mention:       <@123456789012345678>  or  <@!123456789012345678>
 *   • A raw user ID:   123456789012345678
 *   • A username:      someuser
 *   • A display name:  Some Display Name
 *
 * resolveMember  → returns GuildMember | null
 * resolveUser    → returns User | null  (works outside a guild context)
 */

/**
 * Resolve a GuildMember from a mention, user ID, username, or display name.
 *
 * @param {import('discord.js').Message} message
 * @param {string|undefined} input  — raw argument string from args[]
 * @returns {Promise<import('discord.js').GuildMember|null>}
 */
export async function resolveMember(message, input) {
    const guild = message.guild;
    if (!guild) return null;

    // 1. Explicit mention in the message
    const mentioned = message.mentions.members?.first();
    if (mentioned) return mentioned;

    if (!input) return null;

    // 2. Strip mention formatting to get a bare ID or name
    const stripped = input.replace(/^<@!?(\d+)>$/, '$1').trim();

    // 3. Numeric ID — fetch directly (handles users not in cache)
    if (/^\d{15,20}$/.test(stripped)) {
        return guild.members.fetch(stripped).catch(() => null);
    }

    // 4. Username / display name — case-insensitive search in cache
    const lower = stripped.toLowerCase();
    const found = guild.members.cache.find(
        m =>
            m.user.username.toLowerCase() === lower ||
            m.user.globalName?.toLowerCase() === lower ||
            m.displayName.toLowerCase() === lower
    );
    if (found) return found;

    // 5. Partial fetch from Discord API as a last resort (requires GUILD_MEMBERS intent)
    try {
        const fetched = await guild.members.fetch({ query: stripped, limit: 1 });
        return fetched.first() ?? null;
    } catch {
        return null;
    }
}

/**
 * Resolve a User (not necessarily a guild member) from a mention or user ID.
 * Falls back to resolveMember and returns the underlying user.
 *
 * @param {import('discord.js').Message} message
 * @param {string|undefined} input
 * @param {import('discord.js').Client} client
 * @returns {Promise<import('discord.js').User|null>}
 */
export async function resolveUser(message, input, client) {
    // 1. Explicit mention
    const mentionedUser = message.mentions.users?.first();
    if (mentionedUser) return mentionedUser;

    if (!input) return null;

    const stripped = input.replace(/^<@!?(\d+)>$/, '$1').trim();

    // 2. Numeric ID — fetch from API
    if (/^\d{15,20}$/.test(stripped)) {
        return client.users.fetch(stripped).catch(() => null);
    }

    // 3. Fall back to member resolution (guild context)
    const member = await resolveMember(message, input);
    return member?.user ?? null;
}
