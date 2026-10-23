const API_BASE = 'https://discord.com/api/v10';

export const NAMEPLATE_FONTS = {
    default: 0,
    serif: 1,
    mono: 2,
    display: 3,
    vampyre: 4,
};

export const NAMEPLATE_EFFECTS = {
    none: 0,
    gradient: 1,
    holographic: 2,
    glitter: 3,
    confetti: 4,
    neon: 5,
};

// Reference palette: warm amber-gold lettering against Discord's deep navy UI.
// The holographic effect gives the color a subtle animated sheen on supported
// Discord clients while keeping the name readable and professional.
export const DEFAULT_NAMEPLATE = {
    fontId: NAMEPLATE_FONTS.vampyre,
    effectId: NAMEPLATE_EFFECTS.holographic,
    colors: [0xF2A04A, 0xFFD166],
};

export async function applyNameplate(client, guildId, options = {}) {
    const {
        fontId = DEFAULT_NAMEPLATE.fontId,
        effectId = DEFAULT_NAMEPLATE.effectId,
        colors = DEFAULT_NAMEPLATE.colors,
    } = options;

    const res = await fetch(`${API_BASE}/guilds/${guildId}/members/@me`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bot ${client.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            display_name_font_id: fontId,
            display_name_effect_id: effectId,
            display_name_colors: colors,
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return true;
}

export async function applyNameplateToAllGuilds(client, options) {
    const results = [];
    for (const guild of client.guilds.cache.values()) {
        try {
            await applyNameplate(client, guild.id, options);
            results.push({ guildId: guild.id, guildName: guild.name, ok: true });
        } catch (err) {
            results.push({ guildId: guild.id, guildName: guild.name, ok: false, error: err.message });
        }
    }
    return results;
}
