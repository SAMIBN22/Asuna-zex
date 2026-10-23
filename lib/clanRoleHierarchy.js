const ROLE_ORDER = ['leader', 'coLeader', 'manager'];

export async function enforceClanRoleHierarchy(guild, rolesConfig) {
  if (!guild || !rolesConfig) {
    return { reordered: false, skipped: [] };
  }

  const entries = [];
  for (const key of ROLE_ORDER) {
    const roleId = rolesConfig[key];
    if (!roleId) continue;
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    entries.push({ key, role });
  }

  if (entries.length < 2) {
    return { reordered: false, skipped: [] };
  }

  const skipped = [];
  const manageable = entries.filter(({ role }) => {
    if (!role.editable) {
      skipped.push(role.name);
      return false;
    }
    return true;
  });

  if (manageable.length < 2) {
    return { reordered: false, skipped };
  }

  const alreadyOrdered = manageable.every((entry, index) => {
    if (index === 0) return true;
    return manageable[index - 1].role.position > entry.role.position;
  });

  if (alreadyOrdered) {
    return { reordered: false, skipped };
  }

  const availablePositions = manageable
    .map(({ role }) => role.position)
    .sort((a, b) => b - a);

  const positions = manageable.map(({ role }, index) => ({
    role: role.id,
    position: availablePositions[index]
  }));

  try {
    await guild.roles.setPositions(positions);
    return { reordered: true, skipped };
  } catch (error) {
    return { reordered: false, skipped, error };
  }
}
