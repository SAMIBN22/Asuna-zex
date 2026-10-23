import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    Routes,
} from 'discord.js';
import {
    synthesize,
    LANG_INFO,
    mp3ToOgg,
    extractPCM,
    buildWaveform,
} from '../../../lib/edgeTTS.js';
import { geminiDetectAndConvert } from '../../../lib/gemini.js';

function div() {
    return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

export default {
    name: 'tts',
    aliases: ['say', 'speak'],
    description: 'Convert text to a voice message (auto-detects language + Darija)',
    category: 'Fun',
    usage: '&tts <text>',

    async execute(message, args, client) {
        const theme  = await client.themeManager.getTheme(message.guild.id);
        const accent = client.themeManager.getRGBColor(theme.color);
        const emojis = theme.emojis || {};
        const star   = emojis.star  || '';
        const title  = emojis.title || '';

        const replyUI = (container) => message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { repliedUser: false },
        }).catch(() => message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { parse: [] },
        }));

        // ── Validate input ─────────────────────────────────────────────────────
        const text = args.join(' ').trim();
        if (!text) {
            return replyUI(
                new ContainerBuilder().setAccentColor(accent)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${title} Text to Speech\n` +
                        `> ${star} **Usage:** \`&tts <text>\`\n` +
                        `> ${star} **Example:** \`&tts salam labas\`\n` +
                        `> ${star} **Example:** \`&tts هاد الشي مزيان بزاف\`\n` +
                        `> ${star} **Example:** \`&tts Hello everyone!\`\n` +
                        `> ${star} **Languages:** Moroccan Darija • Arabic • French • English • Spanish • Turkish`
                    ))
            );
        }
        if (text.length > 800) {
            return replyUI(
                new ContainerBuilder().setAccentColor(accent)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${title} Text Too Long\n` +
                        `> ${star} Maximum **800 characters**. Your text has **${text.length}** characters.`
                    ))
            );
        }

        // ── Processing indicator ───────────────────────────────────────────────
        const processing = await replyUI(
            new ContainerBuilder().setAccentColor(accent)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${title} Processing...\n> ${star} Detecting language and generating voice message...`
                ))
        );

        // ── Detect language + convert Darija via Gemini ────────────────────────
        let ogg, duration, waveform, langKey, ttsText, geminiUsed = false;
        try {
            let geminiResult;
            try {
                geminiResult = await geminiDetectAndConvert(text);
            } catch {
                // Gemini failed — fallback: treat as English
                geminiResult = { lang: 'en', ttsText: text };
            }

            langKey  = geminiResult.lang;
            ttsText  = geminiResult.ttsText;

            // Gemini was useful if it changed the text (Darija → Fusha)
            geminiUsed = (langKey === 'ar-MA' || langKey === 'ar-DZ') && ttsText !== text;

            const mp3               = await synthesize(ttsText, langKey);
            const [oggBuf, pcmData] = await Promise.all([mp3ToOgg(mp3), extractPCM(mp3)]);
            ogg      = oggBuf;
            duration = pcmData.duration;
            waveform = buildWaveform(pcmData.pcm);
        } catch (err) {
            await processing.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${title} Generation Failed\n` +
                            `> ${star} Could not generate the voice message. Please try again.\n` +
                            `> -# ${err.message}`
                        ))
                ],
            });
            return;
        }

        // ── Send voice message via REST ────────────────────────────────────────
        try {
            await client.rest.post(Routes.channelMessages(message.channelId), {
                body: {
                    flags: MessageFlags.IsVoiceMessage,
                    attachments: [{
                        id: '0',
                        filename: 'voice-message.ogg',
                        duration_secs: duration,
                        waveform: waveform,
                    }],
                },
                files: [{
                    key:  'files[0]',
                    name: 'voice-message.ogg',
                    data: ogg,
                    contentType: 'audio/ogg',
                }],
            });
        } catch (err) {
            await processing.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${title} Send Failed\n` +
                            `> ${star} Could not send the voice message.\n` +
                            `> -# ${err.message}`
                        ))
                ],
            });
            return;
        }

        // ── Success ────────────────────────────────────────────────────────────
        const langName   = LANG_INFO[langKey]?.name || langKey;
        const preview    = text.length    > 60 ? text.slice(0, 57)    + '...' : text;
        const ttsPreview = ttsText.length > 60 ? ttsText.slice(0, 57) + '...' : ttsText;

        const infoLines =
            `> ${star} **Language:** ${langName}\n` +
            (geminiUsed
                ? `> ${star} **Original:** *${preview}*\n` +
                  `> ${star} **Spoken as:** *${ttsPreview}*\n`
                : `> ${star} **Text:** *${preview}*\n`) +
            `> ${star} **Duration:** ${duration.toFixed(1)}s`;

        await processing.edit({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder().setAccentColor(accent)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `## ${title} Voice Message Sent!`
                    ))
                    .addSeparatorComponents(div())
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(infoLines))
                            .setThumbnailAccessory(
                                new ThumbnailBuilder().setURL(
                                    message.author.displayAvatarURL({ extension: 'png', size: 256 })
                                )
                            )
                    )
            ],
        });
    },
};
