/**
 * panelBanner.js
 *
 * Returns the URL to use as the full-width banner image at the top of every
 * control panel (MediaGallery component).
 *
 * Priority order:
 *   1. Random entry from config.panelBanners (the global panel default)
 *   2. The selected guild theme's main image
 *   3. Guild splash image
 *   4. Guild banner image
 *   5. Guild icon
 *   6. Bot avatar  (final fallback — always resolves)
 */

import config from '../config/config.js';

/**
 * @param {import('discord.js').Guild}  guild
 * @param {import('discord.js').Client} client
 * @param {object|null} theme The selected guild theme, when available
 * @returns {string}  A valid image / GIF URL
 */
export function getPanelBanner(guild, client, theme = null) {
    // The configured banner is intentionally checked first so every panel
    // shares the same animated identity by default. Individual panels that
    // explicitly store a custom banner still override this helper.
    const banners = config.panelBanners?.filter(Boolean) ?? [];
    if (banners.length > 0) {
        return banners[Math.floor(Math.random() * banners.length)];
    }

    const selectedTheme = theme || client?.themeManager?.getCachedTheme?.(guild?.id);
    const themeImage = selectedTheme?.images?.main || selectedTheme?.images?.banner || selectedTheme?.images?.help;
    if (themeImage) return themeImage;

    // 3-5. Guild images
    if (guild?.splash) return guild.splashURL({ extension: 'png', size: 1024 });
    if (guild?.banner) return guild.bannerURL({ extension: 'png', size: 1024 });
    const icon = guild?.iconURL({ extension: 'png', size: 1024, dynamic: true });
    if (icon) return icon;

    // 5. Bot avatar
    return client.user.displayAvatarURL({ extension: 'png', size: 1024 });
}
