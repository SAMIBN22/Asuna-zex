import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags 
} from 'discord.js'

// Game state storage
const gameSessions = new Map();

// Choices for the game
const CHOICES = {
  ROCK: 'rock',
  PAPER: 'paper',
  SCISSORS: 'scissors'
};

// Emojis for the choices
const CHOICE_EMOJIS = {
  [CHOICES.ROCK]: '',
  [CHOICES.PAPER]: '',
  [CHOICES.SCISSORS]: ''
};

// Determine the winner
function determineWinner(playerChoice, botChoice) {
  if (playerChoice === botChoice) {
    return 'tie';
  }
  
  if (
    (playerChoice === CHOICES.ROCK && botChoice === CHOICES.SCISSORS) ||
    (playerChoice === CHOICES.PAPER && botChoice === CHOICES.ROCK) ||
    (playerChoice === CHOICES.SCISSORS && botChoice === CHOICES.PAPER)
  ) {
    return 'player';
  }
  
  return 'bot';
}

// Get random choice for bot
function getRandomChoice() {
  const choices = Object.values(CHOICES);
  const randomIndex = Math.floor(Math.random() * choices.length);
  return choices[randomIndex];
}

export default {
  name: 'rock-paper-scissors',
  aliases: ['rps', 'rockpaperscissors'],
  description: 'Play Rock Paper Scissors against the bot!',
  async execute(message, args) {
    const userId = message.author.id;
    
    // Check if user already has an active game
    if (gameSessions.has(userId)) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Game Already Active\nYou already have an active Rock Paper Scissors game. Finish that game first!`)
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
    
    // Create game interface
    const container = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`## Rock Paper Scissors\nChoose your weapon!\n\n${CHOICE_EMOJIS[CHOICES.ROCK]} = Rock\n${CHOICE_EMOJIS[CHOICES.PAPER]} = Paper\n${CHOICE_EMOJIS[CHOICES.SCISSORS]} = Scissors`)
      )
      .addSeparatorComponents()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`Good luck, ${message.author.tag}!`)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rps_${userId}_${CHOICES.ROCK}`)
            .setLabel('\u200b')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(CHOICE_EMOJIS[CHOICES.ROCK])
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rps_${userId}_${CHOICES.PAPER}`)
            .setLabel('\u200b')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(CHOICE_EMOJIS[CHOICES.PAPER])
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rps_${userId}_${CHOICES.SCISSORS}`)
            .setLabel('\u200b')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(CHOICE_EMOJIS[CHOICES.SCISSORS])
        )
      );
    
    return message.reply({ 
      components: [container], 
      flags: [MessageFlags.IsComponentsV2] 
    });
  },
  
  // Handle button interactions for the game
  async interactionHandler(interaction) {
    const userId = interaction.user.id;
    
    // Check if this is a Rock Paper Scissors button
    if (interaction.customId.startsWith(`rps_${userId}_`)) {
      const playerChoice = interaction.customId.split('_')[2];
      
      // Get bot's choice
      const botChoice = getRandomChoice();
      
      // Determine winner
      const winner = determineWinner(playerChoice, botChoice);
      
      // Create result message
      let resultMessage = '';
      let accentColor = 0x2C2F33;
      
      if (winner === 'player') {
        resultMessage = `##  You Win! \n\nYou chose ${CHOICE_EMOJIS[playerChoice]} **${playerChoice.toUpperCase()}**\nBot chose ${CHOICE_EMOJIS[botChoice]} **${botChoice.toUpperCase()}**\n\n**${playerChoice.toUpperCase()} beats ${botChoice.toUpperCase()}!**`;
        accentColor = 0x00FF00;
      } else if (winner === 'bot') {
        resultMessage = `##  You Lose!\n\nYou chose ${CHOICE_EMOJIS[playerChoice]} **${playerChoice.toUpperCase()}**\nBot chose ${CHOICE_EMOJIS[botChoice]} **${botChoice.toUpperCase()}**\n\n**${botChoice.toUpperCase()} beats ${playerChoice.toUpperCase()}!**`;
        accentColor = 0xFFFFFF;
      } else {
        resultMessage = `##  It's a Tie!\n\nYou chose ${CHOICE_EMOJIS[playerChoice]} **${playerChoice.toUpperCase()}**\nBot chose ${CHOICE_EMOJIS[botChoice]} **${botChoice.toUpperCase()}**\n\n**Both chose ${playerChoice.toUpperCase()}!**`;
        accentColor = 0xFFFFFF;
      }
      
      // Create result interface
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(resultMessage)
        )
        .addSeparatorComponents()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`Thanks for playing, ${interaction.user.tag}!`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`rps_play_again_${userId}`)
              .setLabel('Play Again')
              .setStyle(ButtonStyle.Primary)
          )
        );
      
      return interaction.update({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
    
    // Handle play again button
    if (interaction.customId === `rps_play_again_${userId}`) {
      // Create game interface
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Rock Paper Scissors\nChoose your weapon!\n\n${CHOICE_EMOJIS[CHOICES.ROCK]} = Rock\n${CHOICE_EMOJIS[CHOICES.PAPER]} = Paper\n${CHOICE_EMOJIS[CHOICES.SCISSORS]} = Scissors`)
        )
        .addSeparatorComponents()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`Good luck, ${interaction.user.tag}!`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`rps_${userId}_${CHOICES.ROCK}`)
              .setLabel('\u200b')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji(CHOICE_EMOJIS[CHOICES.ROCK])
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`rps_${userId}_${CHOICES.PAPER}`)
              .setLabel('\u200b')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji(CHOICE_EMOJIS[CHOICES.PAPER])
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`rps_${userId}_${CHOICES.SCISSORS}`)
              .setLabel('\u200b')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji(CHOICE_EMOJIS[CHOICES.SCISSORS])
          )
        );
      
      return interaction.update({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
  }
};