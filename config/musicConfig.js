/**
 * Music system configuration — Lavalink nodes + Spotify.
 *
 * Credentials are read from environment variables first; the inline
 * defaults are well-known public Lavalink v4 nodes used as fallbacks.
 * For a production deployment, set LAVALINK_* env vars in Replit Secrets.
 *
 * Required secrets (optional — bot falls back to public nodes):
 *   LAVALINK_HOST      LAVALINK_PORT      LAVALINK_PASSWORD   LAVALINK_SECURE
 *   SPOTIFY_CLIENT_ID  SPOTIFY_CLIENT_SECRET
 */
export default {
    nodes: [
        // ── Custom node (set LAVALINK_* secrets to override) ─────────────
        ...(process.env.LAVALINK_HOST ? [{
            host:        process.env.LAVALINK_HOST,
            port:        Number(process.env.LAVALINK_PORT) || 2333,
            password:    process.env.LAVALINK_PASSWORD     || 'youshallnotpass',
            secure:      process.env.LAVALINK_SECURE === 'true',
            name:        'Custom Node',
            restVersion: 'v4',
            retryAmount: 20,
            retryDelay:  5000,
        }] : []),

        // ── Main node ─────────────────────────────────────────────────────
        ...(!process.env.LAVALINK_HOST ? [
            {
                host:        'lavalink.serenetia.com',
                port:        443,
                password:    'https://dsc.gg/ajidevserver',
                secure:      true,
                name:        'Main Node',
                restVersion: 'v4',
                retryAmount: 10,
                retryDelay:  8000,
            },
        ] : []),
    ],
    spotify: {
        enabled:      process.env.SPOTIFY_ENABLED === 'true',
        clientId:     process.env.SPOTIFY_CLIENT_ID     || '',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    },
    embedColor: '#0061ff',
};
