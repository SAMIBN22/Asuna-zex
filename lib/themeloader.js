import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import themeManager from '../themes/themeManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ThemeLoader {
    constructor(client) {
        this.client = client;
        this.themes = {
            emojis: {},
            images: {}
        };
    }

    async loadThemes() {
        try {
            const themeManagerPath = pathToFileURL(path.join(__dirname, '../themes/themeManager.js')).href;
            const themeModule = await import(`${themeManagerPath}?t=${Date.now()}`);
            const allThemes = themeModule.default.themes;
            
            for (const [themeName, themeData] of Object.entries(allThemes)) {
                this.themes.emojis[themeName] = { ...themeData.emojis };
                this.themes.images[themeName] = { ...themeData.images };
            }
            const defaultTheme = allThemes['black'] || Object.values(allThemes)[0];
            this.themes.emojis['general'] = { ...defaultTheme.emojis };
            this.themes.images['images'] = { ...defaultTheme.images };

            this.client.themes = this.themes;
            this.client.themeManager = themeModule.default;
            return true;
        } catch (error) {
            console.error('Error loading themes from themeManager:', error);
            return false;
        }
    }

    getEmoji(themeName, name) {
        return this.themes.emojis[themeName]?.[name] || null;
    }

    getImage(themeName, name) {
        return this.themes.images[themeName]?.[name] || null;
    }

    getAllEmojis() {
        return this.themes.emojis;
    }

    getAllImages() {
        return this.themes.images;
    }

    getEmojiCategory(category) {
        return this.themes.emojis[category] || {};
    }

    getImageCategory(category) {
        return this.themes.images[category] || {};
    }

    reloadThemes() {
        return this.loadThemes();
    }

    getStats() {
        const themeCount = Object.keys(this.themes.emojis).length;
        return {
            themes: themeCount,
            source: 'themeManager'
        };
    }
}

export default ThemeLoader;
 