import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags 
} from 'discord.js'

// Game state storage
const gameSessions = new Map();

// Generate a random number between min and max
function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default {
  name: 'number-guesser',
  aliases: ['guess', 'numguess'],
  description: 'Play a number guessing game! Try to guess the secret number.',
  async execute(message, args) {
    const userId = message.author.id;
    
    // Check if user already has an active game
    if (gameSessions.has(userId)) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Game Already Active\nYou already have an active Number Guesser game. Finish that game first!`)
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
    
    // Create new game with random number between 1 and 100
    const secretNumber = generateRandomNumber(1, 100);
    
    // Store game state
    const gameState = {
      secretNumber: secretNumber,
      guesses: [],
      attempts: 0,
      maxAttempts: 10,
      player: message.author,
      channelId: message.channel.id,
      minRange: 1,
      maxRange: 100
    };
    
    gameSessions.set(userId, gameState);
    
    // Create game interface
    const container = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`## Number Guesser Game\nI'm thinking of a number between 1 and 100.\nCan you guess it in ${gameState.maxAttempts} attempts or less?\n\n**Attempts Left:** ${gameState.maxAttempts - gameState.attempts}`)
      )
      .addSeparatorComponents()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`Click the button below to make your guess!`)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`guess_number_${userId}`)
            .setLabel('Make a Guess')
            .setStyle(ButtonStyle.Primary)
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
    
    // Check if user has an active game
    if (!gameSessions.has(userId)) {
      return interaction.reply({ 
        content: 'Game session not found or expired!', 
        flags: [64] 
      });
    }
    
    const gameState = gameSessions.get(userId);
    
    // Handle guess button click
    if (interaction.customId === `guess_number_${userId}`) {
      // Create modal for number input
      const modal = new ModalBuilder()
        .setCustomId(`number_guess_modal_${userId}`)
        .setTitle('Number Guesser')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('guess_input')
              .setLabel('Enter your guess (1-100)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Enter a number between 1 and 100')
              .setRequired(true)
              .setMinLength(1)
              .setMaxLength(3)
          )
        );
      
      return interaction.showModal(modal);
    }
  },
  
  // Handle modal submissions
  async modalHandler(interaction) {
    const userId = interaction.user.id;
    
    // Check if user has an active game
    if (!gameSessions.has(userId)) {
      return interaction.reply({ 
        content: 'Game session not found or expired!', 
        flags: [64] 
      });
    }
    
    const gameState = gameSessions.get(userId);
    
    // Handle guess modal submission
    if (interaction.customId === `number_guess_modal_${userId}`) {
      const guessInput = interaction.fields.getTextInputValue('guess_input');
      const guess = parseInt(guessInput);
      
      // Validate input
      if (isNaN(guess) || guess < 1 || guess > 100) {
        return interaction.reply({ 
          content: 'Please enter a valid number between 1 and 100!', 
          flags: [64] 
        });
      }
      
      // Check if number was already guessed
      if (gameState.guesses.includes(guess)) {
        return interaction.reply({ 
          content: 'You already guessed that number! Try a different one.', 
          flags: [64] 
        });
      }
      
      // Record the guess
      gameState.guesses.push(guess);
      gameState.attempts++;
      
      // Check if guess is correct
      if (guess === gameState.secretNumber) {
        // Player wins
        const container = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`##  Congratulations! \nYou guessed the number ${gameState.secretNumber} correctly!\n\n**Attempts Used:** ${gameState.attempts}\n**Performance:** ${gameState.attempts <= 5 ? 'Excellent! ' : gameState.attempts <= 8 ? 'Good! ' : 'Nice try! '}`)
          )
          .addSeparatorComponents()
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`Thanks for playing, ${interaction.user.tag}!`)
          );
        
        // Clean up game session
        gameSessions.delete(userId);
        
        return interaction.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2] 
        });
      }
      
      // Check if player has run out of attempts
      if (gameState.attempts >= gameState.maxAttempts) {
        // Player loses
        const container = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Game Over!\nThe number was ${gameState.secretNumber}.\n\nYou've used all ${gameState.maxAttempts} attempts.\nBetter luck next time!`)
          )
          .addSeparatorComponents()
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`Thanks for playing, ${interaction.user.tag}!`)
          );
        
        // Clean up game session
        gameSessions.delete(userId);
        
        return interaction.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2] 
        });
      }
      
      // Provide hint
      const hint = guess < gameState.secretNumber ? 'higher' : 'lower';
      
      // Update game interface
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Number Guesser Game\nYour guess: ${guess} is **${hint}** than the secret number.\n\n**Attempts Left:** ${gameState.maxAttempts - gameState.attempts}\n**Previous Guesses:** ${gameState.guesses.join(', ')}`)
        )
        .addSeparatorComponents()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`Click the button below to make your next guess!`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`guess_number_${userId}`)
              .setLabel('Make a Guess')
              .setStyle(ButtonStyle.Primary)
          )
        );
      
      return interaction.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
  }
};