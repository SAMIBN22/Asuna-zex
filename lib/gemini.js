import config from '../config/config.js';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiKey}`;

/**
 * Ask Gemini to detect the dialect and return the text ready for TTS.
 * Returns: { lang: 'ar-MA'|'ar-DZ'|'ar-SA'|'fr'|'en'|'es'|'tr', ttsText: string }
 *
 * For Darija (Arabic or Latin script) → converts to Modern Standard Arabic for TTS.
 * For everything else → returns the original text as-is.
 */
export async function geminiDetectAndConvert(text) {
    const prompt =
        `You are a dialect detection and conversion specialist.\n` +
        `Analyze the following text and respond with JSON only — no markdown, no explanation.\n\n` +
        `Rules:\n` +
        `- Detect the dialect/language. Possible values: "ar-MA" (Moroccan Darija, any script), "ar-DZ" (Algerian Darija), "ar-SA" (Standard Arabic), "fr" (French), "en" (English), "es" (Spanish), "tr" (Turkish).\n` +
        `- IMPORTANT: Moroccan Darija written in Latin letters (e.g. "salam labas", "khouya", "walo", "mzyan", "bghit", "daba") must be detected as "ar-MA".\n` +
        `- If the dialect is "ar-MA" or "ar-DZ", convert the text into clear Modern Standard Arabic (فصحى) suitable for TTS. Keep foreign words (French/English) as-is.\n` +
        `- If the dialect is anything else, keep the original text unchanged.\n\n` +
        `Respond with this exact JSON shape:\n` +
        `{"lang":"<code>","ttsText":"<text ready for TTS>"}\n\n` +
        `Text: ${text}`;

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
    });

    if (!res.ok) throw new Error(`Gemini API error ${res.status}`);

    const data   = await res.json();
    const raw    = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const clean  = raw.replace(/```json|```/g, '').trim();

    try {
        const parsed = JSON.parse(clean);
        if (!parsed.lang || !parsed.ttsText) throw new Error('bad shape');
        return parsed;
    } catch {
        // fallback — return original text unchanged
        return { lang: 'en', ttsText: text };
    }
}
