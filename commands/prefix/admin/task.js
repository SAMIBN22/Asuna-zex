/**
 * &task <description>
 * Logs a completed task for the staff member who runs it.
 * The task is stored and visible via &logs-task.
 */
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} from 'discord.js';
import StaffTask from '../../../models/staffTask.js';
import { startColorCycle, CYCLE_COLORS } from '../../../utils/colorCycler.js';

const div = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

export default {
    name:        'task',
    aliases:     ['addtask', 'logtask', 'task-add'],
    description: 'Log a completed task. Usage: &task <description>',
    category:    'Admin',
    usage:       '&task <description>',

    async execute(message, args, client) {
        const theme      = await client.themeManager.getTheme(message.guild.id);
        const accent     = client.themeManager.getRGBColor(theme.color);
        const emojis     = theme.emojis || {};
        const star       = emojis.star  || '';
        const guildId    = message.guild.id;
        const userId     = message.author.id;
        const member     = message.member;

        // ── Permission: role must be higher than the bot's highest role ─────
        const botHighest    = message.guild.members.me.roles.highest.position;
        const memberHighest = message.member.roles.highest.position;
        const isOwner       = message.guild.ownerId === message.author.id;

        if (!isOwner && memberHighest <= botHighest) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xFF4444)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `##   Access Denied\n` +
                            `> This command is restricted to members whose role is **above the bot's role** in the server hierarchy.\n` +
                            `> Ask a server admin to grant you a higher role.`
                        )),
                ],
            });
        }

        // ── Usage ────────────────────────────────────────────────────────────
        if (!args.length) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(accent)
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    `##   Task Logger — Usage\n\n` +
                                    `> ${star} **\`&task <description>\`**\n` +
                                    `> ${star} **\`&task [category] | <description>\`**\n\n` +
                                    `**Examples:**\n` +
                                    `> \`&task Helped 3 members with setup\`\n` +
                                    `> \`&task Moderation | Banned 2 spammers\`\n` +
                                    `> \`&task Support | Resolved 5 tickets\`\n\n` +
                                    `Use **\`&logs-task\`** to view all logged tasks.`
                                ))
                                .setThumbnailAccessory(new ThumbnailBuilder()
                                    .setURL(message.author.displayAvatarURL({ extension: 'png', size: 128 })))
                        ),
                ],
            });
        }

        // ── Parse optional category prefix: "Category | Description" ────────
        const full = args.join(' ');
        let category    = 'General';
        let description = full;

        if (full.includes('|')) {
            const [cat, ...rest] = full.split('|');
            const trimmedCat = cat.trim();
            const trimmedDesc = rest.join('|').trim();
            if (trimmedCat && trimmedDesc) {
                category    = trimmedCat.slice(0, 40);
                description = trimmedDesc;
            }
        }

        if (description.length > 500) {
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder().setAccentColor(0xFF4444)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `##   Description Too Long\n> Maximum **500 characters** — yours is ${description.length}.`
                        )),
                ],
            });
        }

        // ── Save ─────────────────────────────────────────────────────────────
        await StaffTask.create({ guildId, userId, description, category });

        // Count this user's tasks today
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayCount = await StaffTask.countDocuments({
            guildId, userId, createdAt: { $gte: todayStart },
        });
        const totalCount = await StaffTask.countDocuments({ guildId, userId });

        const timestamp = `<t:${Math.floor(Date.now() / 1000)}:R>`;

        const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 });
        const buildTaskPanel = (color) => [
            new ContainerBuilder().setAccentColor(color)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `##   Task Logged\n\n` +
                            `> ${star} **Member:** ${member} \`(${message.author.username})\`\n` +
                            `> ${star} **Category:** \`${category}\`\n` +
                            `> ${star} **Task:** ${description}\n` +
                            `> ${star} **Logged:** ${timestamp}\n\n` +
                            `> **Tasks today:** \`${todayCount}\` · **Total tasks:** \`${totalCount}\``
                        ))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL))
                )
                .addSeparatorComponents(div())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# Use \`&logs-task\` to view the full task log.`
                )),
        ];

        const sent = await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: buildTaskPanel(CYCLE_COLORS[0]),
            allowedMentions: { parse: [] },
        });

        // Cycle colours for 60 seconds (12 rotations through the palette)
        startColorCycle(sent, (color) => buildTaskPanel(color), 60_000);

        return sent;
    },
};
