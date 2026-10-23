import { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import config from '../../../config/config.js';

const OWNER_IDS = (config.devIds || []).map(String);

function sendV2(channel, lines) {
    const c = new ContainerBuilder().setAccentColor(0x7C3AED);
    lines.forEach((l, i) => {
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(l));
        if (i < lines.length - 1) c.addSeparatorComponents(new SeparatorBuilder());
    });
    return channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

export default {
    name: 'resetrole',
    description: 'Replace a role with another role for all members who have it.',
    category: 'Verification',
    usage: '&resetrole <@oldRole> <@newRole>',

    async execute(message, args, client) {
        const isOwner   = OWNER_IDS.includes(message.author.id);
        const isAdmin   = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isOwner && !isAdmin)
            return sendV2(message.channel, ['#  Permission Denied', 'You need **Administrator** permission to use this command.']);

        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles))
            return sendV2(message.channel, ['#  Missing Permission', 'I need the **Manage Roles** permission.']);

        const roleIds = [];
        const re      = /<@&(\d{15,})>/g;
        for (const token of args) {
            let m;
            while ((m = re.exec(token)) !== null) roleIds.push(m[1]);
            if (/^\d{15,}$/.test(token) && !roleIds.includes(token)) roleIds.push(token);
        }
        // fallback: sorted mentions
        if (roleIds.length < 2 && message.mentions.roles.size) {
            const content = message.content;
            for (const [id] of [...message.mentions.roles.entries()].sort((a, b) => content.indexOf(a[0]) - content.indexOf(b[0])))
                if (!roleIds.includes(id)) roleIds.push(id);
        }

        const oldRole = message.guild.roles.cache.get(roleIds[0]);
        const newRole = message.guild.roles.cache.get(roleIds[1]);
        if (!oldRole || !newRole)
            return sendV2(message.channel, ['#  Invalid Usage', 'Please provide two valid roles.\nUsage: `&resetrole <fromRole> <toRole>`']);
        if (oldRole.id === newRole.id)
            return sendV2(message.channel, ['#  Same Role', 'The two roles cannot be the same.']);

        const botHighest = message.guild.members.me.roles.highest;
        if (botHighest.comparePositionTo(oldRole) <= 0 || botHighest.comparePositionTo(newRole) <= 0)
            return sendV2(message.channel, ['#  Role Position Error', 'Both roles must be below my highest role.']);

        await sendV2(message.channel, ['#  Starting', `Replacing <@&${oldRole.id}> → <@&${newRole.id}>. This may take a moment...`]);

        try { await message.guild.members.fetch(); } catch {}

        const members = Array.from(oldRole.members.values());
        if (members.length === 0)
            return sendV2(message.channel, ['#  No Targets', `No members currently have <@&${oldRole.id}>.`]);

        let success = 0, failed = 0;
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const CONCURRENCY = 8;

        async function process(member) {
            try {
                const finalIds = member.roles.cache.map(r => r.id).filter(id => id !== oldRole.id);
                if (!finalIds.includes(newRole.id)) finalIds.push(newRole.id);
                try { await member.roles.set(finalIds); }
                catch (err) {
                    const wait = Math.ceil((err?.rawError?.retry_after || 0) * 1000);
                    if (wait) { await sleep(wait + 100); await member.roles.set(finalIds); }
                    else throw err;
                }
                success++;
            } catch { failed++; }
        }

        await Promise.all(Array.from({ length: CONCURRENCY }, async (_, i) => {
            for (let idx = i; idx < members.length; idx += CONCURRENCY) {
                await process(members[idx]);
                await sleep(60);
            }
        }));

        return sendV2(message.channel, [
            '#  Completed',
            `From: <@&${oldRole.id}> → To: <@&${newRole.id}>`,
            `• Total: ${members.length}  •  Success: ${success}  •  Failed: ${failed}`,
        ]);
    }
};
