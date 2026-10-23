const CUSTOM_EMOJI_PATTERN = /^<(?<animated>a?):(?<name>[A-Za-z0-9_~]+):(?<id>\d{15,21})>$/;
const BARE_CUSTOM_EMOJI_PATTERN = /^(?<animated>a?):(?<name>[A-Za-z0-9_~]+):(?<id>\d{15,21})$/;

/**
 * Returns a Discord-safe emoji string.
 *
 * User-configured emoji values are persisted, so old or manually entered
 * values cannot be trusted when a component is rebuilt. Unicode emoji are
 * accepted as-is; custom emoji are only accepted when the bot can resolve
 * them from the target guild's cache. Invalid or unavailable values use the
 * supplied fallback.
 */
export function getSafeEmoji(value, fallback = '✨', client = null, guildOrId = null) {
    const input = typeof value === 'string' ? value.trim() : '';
    if (!input) return fallback;

    const customMatch = input.match(CUSTOM_EMOJI_PATTERN) ||
        input.match(BARE_CUSTOM_EMOJI_PATTERN);
    if (customMatch?.groups) {
        const { id } = customMatch.groups;
        const guild = typeof guildOrId === 'string'
            ? client?.guilds?.cache?.get(guildOrId)
            : guildOrId;
        const cachedEmoji = guild?.emojis?.cache?.get(id);
        if (cachedEmoji) return cachedEmoji.toString();

        // A custom emoji from another guild, a deleted emoji, or an emoji
        // without a target guild cannot safely be used in a component.
        return fallback;
    }

    // Avoid passing plain text such as "gamer", "null", or an old emoji
    // name into setEmoji(). These values trigger COMPONENT_INVALID_EMOJI.
    if (/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(input)) {
        return input;
    }

    return fallback;
}