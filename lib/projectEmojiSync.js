import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PermissionFlagsBits } from 'discord.js';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const BOT_DIRECTORY = path.resolve(MODULE_DIRECTORY, '..');
const CUSTOM_EMOJI_PATTERN = /<a?:([A-Za-z0-9_~-]+):(\d{15,25})>/g;
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.cache', 'logs']);
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const REQUEST_DELAY_MS = 350;
const FETCH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;
const TOTAL_SYNC_TIMEOUT_MS = 90_000;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function withTimeout(promise, milliseconds, label) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(
                    () => reject(new Error(`${label} timed out after ${milliseconds}ms`)),
                    milliseconds,
                );
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}

async function collectFiles(directory) {
    const files = [];
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (!IGNORED_DIRECTORIES.has(entry.name)) {
                files.push(...await collectFiles(path.join(directory, entry.name)));
            }
            continue;
        }

        if (!entry.isFile()) continue;
        const filePath = path.join(directory, entry.name);
        const stats = await fs.stat(filePath).catch(() => null);
        if (stats?.size && stats.size <= MAX_FILE_SIZE) files.push(filePath);
    }

    return files;
}

export async function extractProjectEmojis() {
    const found = new Map();
    const files = await collectFiles(BOT_DIRECTORY);

    for (const filePath of files) {
        const buffer = await fs.readFile(filePath).catch(() => null);
        if (!buffer || buffer.includes(0)) continue;

        for (const match of buffer.toString('utf8').matchAll(CUSTOM_EMOJI_PATTERN)) {
            const [, name, id] = match;
            const animated = match[0].startsWith('<a:');
            const existing = found.get(id);

            if (!existing) {
                found.set(id, { id, name, animated });
            } else if (existing.name.length < name.length) {
                existing.name = name;
            }
        }
    }

    return [...found.values()];
}

function makeSafeEmojiName(name, usedNames) {
    const baseName = sanitizeEmojiName(name);
    let candidate = baseName.length >= 2 ? baseName : `${baseName}_e`;
    let suffix = 1;

    while (usedNames.has(candidate.toLowerCase())) {
        const suffixText = `_${suffix++}`;
        candidate = `${baseName.slice(0, 32 - suffixText.length)}${suffixText}`;
    }

    usedNames.add(candidate.toLowerCase());
    return candidate;
}

function sanitizeEmojiName(name) {
    return name.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 27) || 'project_emoji';
}

function hasManageExpressions(guild) {
    return guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuildExpressions) ?? false;
}

async function downloadEmoji(id, animated) {
    const extension = animated ? 'gif' : 'png';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(
            `https://cdn.discordapp.com/emojis/${id}.${extension}?size=128&quality=lossless`,
            { signal: controller.signal },
        );

        if (!response.ok) {
            throw new Error(`source returned HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            throw new Error('source did not return an image');
        }

        return Buffer.from(await response.arrayBuffer());
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Imports custom emoji references from the project into one guild.
 * This is deliberately best-effort: an unavailable source emoji or a full
 * guild emoji slot must never prevent the bot from coming online.
 */
export async function syncProjectEmojis(guild, { logger = console } = {}) {
    if (!guild) return { status: 'skipped', reason: 'guild-not-found' };
    if (!hasManageExpressions(guild)) {
        return { status: 'skipped', reason: 'missing-manage-expressions' };
    }

    const projectEmojis = await extractProjectEmojis();
    if (projectEmojis.length === 0) {
        return { status: 'skipped', reason: 'no-custom-emojis', total: 0 };
    }

    const existingEmojis = await guild.emojis.fetch().catch(() => guild.emojis.cache);
    const existingNames = new Set(
        existingEmojis
            .map((emoji) => emoji.name?.toLowerCase())
            .filter(Boolean),
    );
    const existingIds = new Set(existingEmojis.map((emoji) => emoji.id));
    const imported = [];
    const skipped = [];
    const failed = [];

    logger.log(`[EmojiSync] ${guild.name}: checking ${projectEmojis.length} project emoji reference(s)...`);

    const syncDeadline = Date.now() + TOTAL_SYNC_TIMEOUT_MS;

    for (const projectEmoji of projectEmojis) {
        if (Date.now() >= syncDeadline) {
            failed.push('sync deadline reached');
            logger.warn(`[EmojiSync] ${guild.name}: stopping after the ${TOTAL_SYNC_TIMEOUT_MS}ms safety deadline.`);
            break;
        }

        if (existingIds.has(projectEmoji.id)) {
            skipped.push(projectEmoji.id);
            continue;
        }

        // Imported emojis receive a new Discord ID. Match by the sanitized
        // project name as well, otherwise every bot restart would duplicate
        // the same project emojis until the guild quota was exhausted.
        const baseName = sanitizeEmojiName(projectEmoji.name).toLowerCase();
        if (existingNames.has(baseName)) {
            skipped.push(`${projectEmoji.id}:name`);
            continue;
        }

        const emojiName = makeSafeEmojiName(projectEmoji.name, existingNames);
        try {
            const image = await downloadEmoji(projectEmoji.id, projectEmoji.animated);
            const created = await withTimeout(
                guild.emojis.create({
                    attachment: image,
                    name: emojiName,
                    reason: 'Synchronize project emoji references',
                }),
                CREATE_TIMEOUT_MS,
                `creating ${emojiName}`,
            );
            imported.push(created);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            failed.push(`${projectEmoji.name} (${message})`);

            // Discord may report a full emoji quota. Continuing would only
            // produce identical failures and needlessly hit the API.
            if (/maximum number|quota|limit|30008|30056/i.test(message)) {
                failed.push('Stopped: the server has no available emoji slots');
                break;
            }
        }

        const processed = imported.length + skipped.length + failed.length;
        logger.log(
            `[EmojiSync] ${guild.name}: ${processed}/${projectEmojis.length} processed ` +
            `(${imported.length} imported, ${skipped.length} skipped, ${failed.length} failed).`,
        );
        await wait(REQUEST_DELAY_MS);
    }

    const result = {
        status: 'completed',
        total: projectEmojis.length,
        imported: imported.length,
        skipped: skipped.length,
        failed: failed.length,
        failedExamples: failed.slice(0, 8),
    };

    logger.log(
        `[EmojiSync] ${guild.name}: ${result.imported} imported, ` +
        `${result.skipped} already present, ${result.failed} unavailable/failed.`,
    );
    if (result.failedExamples.length > 0) {
        logger.warn(`[EmojiSync] Failed examples: ${result.failedExamples.join(', ')}`);
    }

    return result;
}