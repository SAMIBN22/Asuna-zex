import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  SectionBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize, 
  ThumbnailBuilder, 
  MessageFlags, 
  PermissionsBitField, 
  ComponentType 
} from 'discord.js'

export default {
  name: 'poll',
  description: 'Create a poll with buttons and progress bars',
  aliases: ['pole'],
  usage: '[(description)] <option1> and <option2> [and ...]',
  category: 'Admin',
  userPermissions: ['Administrator'],
  botPermissions: ['SendMessages'],
  cooldown: 5,
  enabled: true,
  ownerOnly: false,
  execute: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Permission Denied\nYou need Administrator permission to use this command.`)
        );
      return message.reply({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
    }

    await message.delete().catch(console.error);

    try {
      // Parse description and options
      const input = args.join(' ');
      const descriptionRegex = /^\((.*?)\)\s*/;
      let description = '';
      let optionsInput = input;

      const descMatch = input.match(descriptionRegex);
      if (descMatch) {
        description = descMatch[1].trim();
        optionsInput = input.replace(descriptionRegex, '').trim();
      }

      const rawOptions = optionsInput.split(/\s+and\s+/).filter(opt => opt.trim() !== '');
      if (rawOptions.length < 2) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`# Invalid Input\nPlease provide at least 2 options using "and" between them.\nExample: \`+poll (Description) option1 and option2\``)
          );
        return message.channel.send({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
      }

      if (rawOptions.length > 10) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`# Too Many Options\nMaximum 10 options allowed.`)
          );
        return message.channel.send({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
      }

      const options = rawOptions.map(opt => opt.trim());
      const votes = new Map();
      const voters = new Map();

      const generateProgressBar = (option, percentage) => {
        const totalBars = 30;
        const filledBars = Math.round((percentage / 100) * totalBars);
        const emptyBars = totalBars - filledBars;
        const maxOptionLength = 15;
        const truncatedOption = option.length > maxOptionLength ? option.substring(0, maxOptionLength - 3) + '...' : option;
        const paddedOption = truncatedOption.padEnd(maxOptionLength, ' ');
        return `\`\`\`[${paddedOption}${filledBars > 0 ? ' ' + '█'.repeat(filledBars - 1) : ''}${emptyBars > 0 ? '-'.repeat(emptyBars) : ''}]\`\`\``;
      };

      const createPollContainer = (disabled = false) => {
        const container = new ContainerBuilder().setAccentColor(0xFFFFFF);

        container.addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# New Poll\n${description ? `${description}\n\n` : ''}════ Options ════\n` +
              options.map((opt, i) => {
                const voteCount = votes.get(i) || 0;
                const totalVotes = Array.from(votes.values()).reduce((a, b) => a + b, 0) || 1;
                const percentage = (voteCount / totalVotes) * 100;
                return `${generateProgressBar(opt, percentage)}`;
              }).join('\n'))
        );

        container
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`Poll by ${message.author.tag}`)
          );

        const rows = [];
        let currentRow = new ActionRowBuilder();

        options.forEach((_, index) => {
          const button = new ButtonBuilder()
            .setCustomId(`poll_${index}`)
            .setLabel(`Option ${index + 1}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled);
          currentRow.addComponents(button);
          if (currentRow.components.length === 5 || index === options.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
          }
        });

        container.addActionRowComponents(...rows);
        return container;
      };

      const poll = await message.channel.send({
        components: [createPollContainer()],
        flags: [MessageFlags.IsComponentsV2]
      });

      const safeEdit = async (msg, content) => {
        try {
          await msg.edit(content);
        } catch (err) {
          if (err.code !== 10008) console.error(err); // ignore Unknown Message
        }
      };

      const buttonCollector = poll.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000 // 3 minutes
      });

      buttonCollector.on('collect', async (interaction) => {
        const optionIndex = parseInt(interaction.customId.split('_')[1]);

        if (voters.has(interaction.user.id)) {
          const previousVote = voters.get(interaction.user.id);
          votes.set(previousVote, votes.get(previousVote) - 1);
        }

        votes.set(optionIndex, (votes.get(optionIndex) || 0) + 1);
        voters.set(interaction.user.id, optionIndex);

        await safeEdit(poll, {
          components: [createPollContainer()],
          flags: [MessageFlags.IsComponentsV2]
        });

        const responseContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`# Vote Recorded\nYour vote has been recorded!`)
          );

        await interaction.reply({ components: [responseContainer], flags: [MessageFlags.IsComponentsV2], flags: [64] });
      });

      buttonCollector.on('end', async () => {
        // Disable buttons immediately
        await safeEdit(poll, {
          components: [createPollContainer(true)],
          flags: [MessageFlags.IsComponentsV2]
        });

        // Wait 2 minutes, then show final results + winner
        setTimeout(async () => {
          const maxVotes = Math.max(...Array.from(votes.values()), 0);
          const winners = options.filter((_, i) => votes.get(i) === maxVotes);
          const winnerText = winners.length === 1 ? `Winner: ${winners[0]}` : `Winners: ${winners.join(', ')}`;

          await safeEdit(poll, {
            components: [createPollContainer(true)],
            flags: [MessageFlags.IsComponentsV2]
          });

          await message.channel.send(` **Poll ended!**\n${winnerText}`);
        }, 120000); // 2 minutes
      });

    } catch (error) {
      console.error('Error creating poll:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Error\nAn error occurred while creating the poll.`)
        );
      await message.channel.send({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
    }
  }
};
