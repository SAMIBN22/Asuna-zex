/**
 * Grantable command catalog for the &taysse permission system.
 *
 * Rather than hand-maintaining a fixed list, this module builds the catalog
 * dynamically from every command the bot has loaded (`client.prefixCommands`).
 * A command is considered "grantable" when it is normally restricted —
 * i.e. it declares Discord `permissions`, a `requiredRoles` guild-config
 * field, or lives in the `Owner` category — and is not on the exclusion list
 * below. This keeps the catalog in sync with the project automatically as
 * commands are added or removed.
 */

/**
 * Commands that must never be delegated, regardless of category:
 *  - taysse / taysse2 / musicperm — the permission & automation management
 *    panels themselves. Delegating these would let a delegated user grant
 *    further permissions to others (privilege escalation).
 *  - inf — grants infinite in-server currency; economy-breaking if misused.
 * Include every alias for each so they cannot be granted under another name.
 */
const NON_DELEGABLE = new Set([
    'taysse', 'permissions', 'permpanel', 'grantperm',
    'taysse2', 'smartpanel', 'autopanel',
    'musicperm', 'mperm', 'musicaccess',
    'inf', 'infinf', 'setinf', 'grantinf',
]);

/**
 * Build the full grantable command catalog, grouped by category.
 * @param {import('discord.js').Client} client
 * @returns {Map<string, Array<{ name: string, label: string, description: string }>>}
 */
export function getGrantableCatalog(client) {
    const catalog = new Map();
    const seen = new Set();

    for (const command of client.prefixCommands.values()) {
        if (!command?.name || seen.has(command.name)) continue;
        seen.add(command.name);

        if (NON_DELEGABLE.has(command.name)) continue;

        const isRestricted = Boolean(
            command.permissions?.length || command.requiredRoles || command.category === 'Owner'
        );
        if (!isRestricted) continue;

        const category = command.category || 'General';
        const entry = {
            name: command.name,
            label: command.name.length > 100 ? command.name.slice(0, 100) : command.name,
            description: (command.description || 'No description provided.').slice(0, 100),
        };

        if (!catalog.has(category)) catalog.set(category, []);
        catalog.get(category).push(entry);
    }

    for (const list of catalog.values()) {
        list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return catalog;
}

/** Look up a single command's display label (falls back to the raw name). */
export function getCommandLabel(client, name) {
    return client.prefixCommands.get(name)?.name || name;
}
