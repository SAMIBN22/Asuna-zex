import { resolveUser } from '../../../lib/resolveUser.js';
import { resolveMember } from '../../../lib/resolveUser.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js'

export default {
    name: 'roles-manager',
    description: 'Advanced Role Management Dashboard',
    aliases: ['rm', 'manage-roles'],
    category: 'Admin',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: ' **Access Denied:** Administrator permissions required.' });
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(' Roles Control Panel')
            .setDescription('Select an action below to manage server roles.')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('rm_list_roles')
                .setLabel('List All Roles')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rm_add_all')
                .setLabel('Add Role to All')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('rm_remove_all')
                .setLabel('Remove Role from All')
                .setStyle(ButtonStyle.Danger)
        );

        const panel = await message.reply({
            embeds: [embed],
            components: [row]
        });

        const collector = panel.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'rm_list_roles') {
                const roles = interaction.guild.roles.cache
                    .filter(r => r.name !== '@everyone')
                    .sort((a, b) => b.position - a.position)
                    .map(r => `• ${r.name} (\`${r.id}\`)`)
                    .join('\n');

                await interaction.reply({
                    content: `###  Server Roles:\n${roles.slice(0, 1900)}`,
                    flags: [MessageFlags.Ephemeral]
                });
            } else if (interaction.customId === 'rm_add_all' || interaction.customId === 'rm_remove_all') {
                const isAdding = interaction.customId === 'rm_add_all';
                
                const modal = new ModalBuilder()
                    .setCustomId(isAdding ? `modal_add_role_${Date.now()}` : `modal_remove_role_${Date.now()}`)
                    .setTitle(isAdding ? 'Add Role to All' : 'Remove Role from All');

                const roleIdInput = new TextInputBuilder()
                    .setCustomId('role_id_input')
                    .setLabel('Role ID')
                    .setPlaceholder('Enter the Role ID here...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(roleIdInput);
                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);

                try {
                    const submitted = await interaction.awaitModalSubmit({
                        time: 60000,
                        filter: i => i.user.id === interaction.user.id,
                    });

                    const roleId = submitted.fields.getTextInputValue('role_id_input');
                    const role = interaction.guild.roles.cache.get(roleId);

                    if (!role) {
                        return submitted.reply({ content: ' **Error:** Invalid Role ID.', flags: [MessageFlags.Ephemeral] });
                    }
                    if (role.managed) {
                        return submitted.reply({ content: ' **Error:** Cannot manage integrated/bot roles.', flags: [MessageFlags.Ephemeral] });
                    }
                    
                    const botMember = interaction.guild.members.me;
                    if (role.position >= botMember.roles.highest.position) {
                        return submitted.reply({ content: ' **Error:** This role is higher than my highest role.', flags: [MessageFlags.Ephemeral] });
                    }

                    await submitted.reply({ content: ` **Processing:** Starting to ${isAdding ? 'add' : 'remove'} **${role.name}** for all members...`, flags: [MessageFlags.Ephemeral] });
                    
                    try {
                        // Use a safer way to fetch all members if the guild is large
                        const members = interaction.guild.memberCount < 1000 ? 
                            await interaction.guild.members.fetch() : 
                            Array.from((await interaction.guild.members.fetch()).values());

                        let count = 0;
                        let skipped = 0;

                        for (const member of (Array.isArray(members) ? members : Array.from(members.values()))) {
                            try {
                                if (isAdding && !member.roles.cache.has(role.id)) {
                                    await member.roles.add(role);
                                    count++;
                                } else if (!isAdding && member.roles.cache.has(role.id)) {
                                    await member.roles.remove(role);
                                    count++;
                                } else {
                                    skipped++;
                                }
                                
                                if (count > 0 && count % 5 === 0) {
                                    await new Promise(r => setTimeout(r, 1500));
                                }
                            } catch (err) {
                                // Ignore permission errors for individual members
                            }
                        }

                        await interaction.channel.send(` **Task Completed:**\n- Role: **${role.name}**\n- Updated: **${count}** members.\n- Skipped: **${skipped}**.`);
                    } catch (err) {
                        console.error('Fetch members error:', err);
                        await interaction.channel.send(' **Error:** Failed to process members. This might be due to server size limits.');
                    }
                } catch (err) {
                    // Modal timed out or other error
                }
            }
        });

        collector.on('end', () => {
            panel.edit({ components: [] }).catch(() => {});
        });
    }
};
