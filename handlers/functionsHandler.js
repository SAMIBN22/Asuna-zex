import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FunctionsHandler {
    constructor(client) {
        this.client = client;
        this.functions = new Map();
        this.functionStats = {
            total: 0,
            categories: new Map()
        };
    }

    async loadFunctions() {
        const functionsPath = path.join(__dirname, '..', 'functions');

        if (!fs.existsSync(functionsPath)) {
            console.warn('⚠️ Functions directory not found');
            return;
        }

        const functionFiles = fs.readdirSync(functionsPath).filter(file => file.endsWith('.js'));

        for (const file of functionFiles) {
            try {
                const filePath = path.join(functionsPath, file);
                const fileUrl = pathToFileURL(filePath).href;
                const func = await import(`${fileUrl}?t=${Date.now()}`);

                if (func.default) {
                    const functionName = path.basename(file, '.js');

                    if (typeof func.default === 'function') {
                        this.functions.set(functionName, func.default);
                    } else if (func.default.name) {
                        this.functions.set(func.default.name, func.default);
                    } else {
                        this.functions.set(functionName, func.default);
                    }

                    this.functionStats.total++;

                    if (func.default.category) {
                        const category = func.default.category;
                        this.functionStats.categories.set(category, (this.functionStats.categories.get(category) || 0) + 1);
                    }
                }
            } catch (error) {
                console.error(`❌ Error loading function ${file}:`, error.message);
            }
        }

        this.logStats();
    }

    async loadAll() {
        return await this.loadFunctions();
    }

    getFunction(name) {
        return this.functions.get(name);
    }

    getAllFunctions() {
        return this.functions;
    }

    getFunctionsByCategory(category) {
        const functions = [];

        for (const [name, func] of this.functions) {
            if (func.category === category) {
                functions.push({ name, func });
            }
        }

        return functions;
    }

    async executeFunction(name, ...args) {
        const func = this.getFunction(name);

        if (!func) {
            throw new Error(`Function ${name} not found`);
        }

        if (typeof func === 'function') {
            return await func(...args);
        } else if (typeof func.execute === 'function') {
            return await func.execute(...args);
        } else {
            throw new Error(`Function ${name} is not executable`);
        }
    }

    reloadFunction(functionName) {
        this.functions.delete(functionName);
    }

    validateFunction(func) {
        if (typeof func === 'function') {
            return true;
        }

        if (typeof func === 'object' && func !== null) {
            if (typeof func.execute === 'function') {
                return true;
            }
        }

        throw new Error('Function must be a function or have an execute method');
    }

    getStats() {
        return {
            total: this.functionStats.total,
            categories: Object.fromEntries(this.functionStats.categories)
        };
    }

    logStats() {
        // Stats logging disabled for clean output
    }

    async initializeFunctions() {
        for (const [name, func] of this.functions) {
            try {
                if (typeof func === 'object' && func.init && typeof func.init === 'function') {
                    await func.init(this.client);
                }
            } catch (error) {
                console.error(`❌ Error initializing function ${name}:`, error.message);
            }
        }
    }

    async destroyFunctions() {
        for (const [name, func] of this.functions) {
            try {
                if (typeof func === 'object' && func.destroy && typeof func.destroy === 'function') {
                    await func.destroy();
                }
            } catch (error) {
                console.error(`❌ Error destroying function ${name}:`, error.message);
            }
        }
    }

    addFunction(name, func) {
        this.validateFunction(func);
        this.functions.set(name, func);
        this.functionStats.total++;
    }

    removeFunction(name) {
        if (this.functions.has(name)) {
            this.functions.delete(name);
            this.functionStats.total--;
            return true;
        }
        return false;
    }

    hasFunction(name) {
        return this.functions.has(name);
    }

    listFunctions() {
        return Array.from(this.functions.keys());
    }
}

export default FunctionsHandler;
