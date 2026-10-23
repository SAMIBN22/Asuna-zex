import colors from '../utils/colors.js';

class FileReloader {
    constructor(client) {
        this.client = client;
        this.isWatching = false;
    }

    init() {
        // Auto-reload disabled in production to prevent unexpected restarts.
        // Enable by setting ENABLE_HOT_RELOAD=true in environment variables.
        if (process.env.ENABLE_HOT_RELOAD === 'true') {
            this.startWatching();
        }
    }

    async startWatching() {
        try {
            const { default: chokidar } = await import('chokidar');
            const path = (await import('path')).default;
            const { fileURLToPath } = await import('url');

            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            const watchPath = path.join(__dirname, '..');
            this.watcher = chokidar.watch(watchPath, {
                ignored: /(node_modules|\.git|\.db|logs|\.env)/,
                persistent: true,
                ignoreInitial: true,
                awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
            });

            this.watcher
                .on('change', filePath => this.handleChange('edited', filePath));

            this.isWatching = true;
            console.log(colors.success('[RELOAD] Hot-reload enabled.'));
        } catch (err) {
            console.error(colors.error('[RELOAD] Failed to start watcher:', err.message));
        }
    }

    handleChange(type, filePath) {
        if (!filePath.endsWith('.js')) return;
        console.log(colors.info(`[RELOAD] File ${type}: ${filePath}`));
    }

    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            this.isWatching = false;
        }
    }
}

export default FileReloader;
