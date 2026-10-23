import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ClanThemeLoader {
  constructor(client) {
    this.client = client;
    this.themes = { emojis: {}, images: {} };
    this.themePath = path.join(__dirname, '..', 'themes', 'clan');
  }

  loadThemes() {
    this.loadEmojis();
    this.loadImages();
    this.client.clanThemes = this.themes;
    return this.themes;
  }

  loadEmojis() {
    const emojisPath = path.join(this.themePath, 'emojis');
    if (!fs.existsSync(emojisPath)) return;

    for (const file of fs.readdirSync(emojisPath).filter(f => f.endsWith('.json'))) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(emojisPath, file), 'utf8'));
        this.themes.emojis[path.basename(file, '.json')] = data;
      } catch (err) {
        console.error(`[ClanThemeLoader] Error loading emoji file ${file}:`, err.message);
      }
    }
  }

  loadImages() {
    const imagesPath = path.join(this.themePath, 'images');
    if (!fs.existsSync(imagesPath)) return;

    for (const file of fs.readdirSync(imagesPath).filter(f => f.endsWith('.json'))) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(imagesPath, file), 'utf8'));
        this.themes.images[path.basename(file, '.json')] = data;
      } catch (err) {
        console.error(`[ClanThemeLoader] Error loading image file ${file}:`, err.message);
      }
    }
  }
}

export default ClanThemeLoader;
