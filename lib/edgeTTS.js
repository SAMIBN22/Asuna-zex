import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

// ── Language info ──────────────────────────────────────────────────────────────
export const LANG_INFO = {
    'ar-DZ': { name: '🇩🇿 دارجة جزائرية', code: 'ar' },
    'ar-MA': { name: '🇲🇦 دارجة مغربية',  code: 'ar' },
    'ar-SA': { name: '🇸🇦 عربي فصحى',    code: 'ar' },
    'ar-EG': { name: '🇪🇬 عربي مصري',    code: 'ar' },
    'ar':    { name: ' عربي',           code: 'ar' },
    'fr':    { name: '🇫🇷 French',        code: 'fr' },
    'en':    { name: '🇬🇧 English',       code: 'en' },
    'es':    { name: '🇪🇸 Spanish',       code: 'es' },
    'tr':    { name: '🇹🇷 Turkish',       code: 'tr' },
};

// ── Auto language detection ────────────────────────────────────────────────────
export function detectLang(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;

    // Any Arabic characters at all → treat as Arabic dialect
    if (arabicChars > 0) {
        if (/واش|كيما|نتا|رانا|بزاف|هاك|راك|يزي|قاع/.test(text)) return 'ar-DZ';
        if (/هاد|ديال|مزيان|كاين|بغا|كنت|بلا|واخا|دابا|بزاف/.test(text)) return 'ar-MA';
        if (/إيه|عيني|يالله|ابشر|هيه|يبه/.test(text))             return 'ar-SA';
        // Default for any Arabic text
        return 'ar-SA';
    }

    if (/\b(je|tu|il|nous|vous|ils|les|des|une|bonjour|merci|oui|non|est|avec|pour)\b/i.test(text)) return 'fr';
    if (/\b(hola|gracias|buenos|señor|como|está|nosotros|favor|qué)\b/i.test(text))               return 'es';
    if (/\b(merhaba|teşekkür|evet|hayır|nasıl|tamam|lütfen)\b/i.test(text))                       return 'tr';
    return 'en';
}

// ── Split long text into ≤190-char chunks ──────────────────────────────────────
function splitText(text, maxLen = 190) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    let rest = text;
    while (rest.length > maxLen) {
        let cut = rest.lastIndexOf(' ', maxLen);
        if (cut <= 0) cut = maxLen;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
}

// ── Fetch one MP3 chunk from Google Translate TTS ─────────────────────────────
async function fetchChunk(text, langCode) {
    const params = new URLSearchParams({
        ie: 'UTF-8', client: 'tw-ob', q: text, tl: langCode,
        total: '1', idx: '0', textlen: String(text.length), prev: 'input',
    });
    const res = await fetch(`https://translate.google.com/translate_tts?${params}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
        },
    });
    if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 50) throw new Error('Empty audio response');
    return buf;
}

// ── Synthesize text → MP3 buffer ──────────────────────────────────────────────
export async function synthesize(text, langKey) {
    const code   = LANG_INFO[langKey]?.code || 'en';
    const chunks = splitText(text.trim());
    const parts  = [];
    for (const chunk of chunks) parts.push(await fetchChunk(chunk, code));
    return Buffer.concat(parts);
}

// ── Run FFmpeg: pipe mp3Buffer in, collect stdout ──────────────────────────────
function ffmpeg(mp3Buffer, args) {
    return new Promise((resolve, reject) => {
        const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', ...args, 'pipe:1']);
        const out = [];
        ff.stdout.on('data', d => out.push(d));
        ff.stdout.on('end',  () => resolve(Buffer.concat(out)));
        ff.stderr.on('data', () => {});
        ff.on('error', reject);
        ff.stdin.write(mp3Buffer);
        ff.stdin.end();
    });
}

// ── Convert MP3 → OGG Opus (required for Discord voice messages) ───────────────
export async function mp3ToOgg(mp3Buffer) {
    return ffmpeg(mp3Buffer, [
        '-c:a', 'libopus',
        '-ar', '48000',
        '-ac', '1',
        '-b:a', '64k',
        '-f', 'ogg',
    ]);
}

// ── Extract f32le PCM at low rate (for waveform + duration) ───────────────────
export async function extractPCM(mp3Buffer) {
    const pcm = await ffmpeg(mp3Buffer, [
        '-f', 'f32le',
        '-ar', '8000',   // 8 kHz is plenty for a 256-point waveform
        '-ac', '1',
    ]);
    const duration = pcm.length / (8000 * 4);  // f32le @ 8kHz
    return { pcm, duration };
}

// ── Build a 256-byte waveform and base64-encode it ────────────────────────────
export function buildWaveform(pcmBuffer) {
    const floats = pcmBuffer.length / 4;
    const step   = Math.max(1, Math.floor(floats / 256));
    const wave   = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) {
        let sum = 0, n = 0;
        for (let j = i * step; j < Math.min((i + 1) * step, floats); j++, n++) {
            sum += Math.abs(pcmBuffer.readFloatLE(j * 4));
        }
        wave[i] = n ? Math.min(255, Math.round((sum / n) * 255)) : 0;
    }
    return wave.toString('base64');
}
