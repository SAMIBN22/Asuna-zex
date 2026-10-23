/**
 * Rank Role Manager
 * Automatically grants/updates a member's rank role when their Voice or Text
 * level (from the &lvl / &top dual XP system) crosses a configured threshold.
 * Only the highest tier the member qualifies for on a given track is kept —
 * lower tier roles from the same track are removed to avoid clutter.
 */
import RankRole from '../models/rankRole.js';

export async function applyRankRoles(member, guildId, track, level) {
    if (!member || level == null) return null;

    const tiers = await RankRole.getForGuild(guildId, track); // sorted level desc
    if (tiers.length === 0) return null;

    const eligible = tiers.filter(t => t.level <= level);
    const target = eligible[0] || null; // highest tier the member qualifies for

    const trackRoleIds = new Set(tiers.map(t => t.roleId));
    const me = member.guild.members.me;

    try {
        if (target && !member.roles.cache.has(target.roleId)) {
            const role = member.guild.roles.cache.get(target.roleId);
            if (role && me?.roles.highest.position > role.position) {
                await member.roles.add(target.roleId).catch(() => {});
            }
        }

        // Remove any other tier roles from this track that are no longer the target
        for (const roleId of trackRoleIds) {
            if (target && roleId === target.roleId) continue;
            if (member.roles.cache.has(roleId)) {
                const role = member.guild.roles.cache.get(roleId);
                if (role && me?.roles.highest.position > role.position) {
                    await member.roles.remove(roleId).catch(() => {});
                }
            }
        }
    } catch { /* missing permissions or role hierarchy issue — never break XP flow */ }

    return target;
}

export default { applyRankRoles };
