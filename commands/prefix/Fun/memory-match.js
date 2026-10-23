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

// Emoji pairs for the memory game
const EMOJI_PAIRS = ['', '', '', '', '', '', '', '', '', '', '', ''];

// Create game board
function createGameBoard(gameId) {
  // Take first 8 emojis and duplicate them
  const emojis = EMOJI_PAIRS.slice(0, 8);
  const pairs = [...emojis, ...emojis];
  
  // Shuffle the pairs
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  
  return pairs;
}

// Create buttons for the game board
function createGameButtons(gameId, board, revealed, matched) {
  const rows = [];
  let rowComponents = [];
  
  for (let i = 0; i < board.length; i++) {
    // Create button with emoji if revealed or matched, otherwise use question mark
    const isRevealed = revealed.includes(i);
    const isMatched = matched.includes(i);
    const emoji = (isRevealed || isMatched) ? board[i] : '';
    
    const button = new ButtonBuilder()
      .setCustomId(`memory_${gameId}_${i}`)
      .setLabel('\u200b')
      .setStyle(isMatched ? ButtonStyle.Success : (isRevealed ? ButtonStyle.Primary : ButtonStyle.Secondary))
      .setEmoji(emoji);
    
    rowComponents.push(button);
    
    // Create a new row every 4 buttons
    if ((i + 1) % 4 === 0) {
      rows.push(new ActionRowBuilder().addComponents(rowComponents));
      rowComponents = [];
    }
  }
  
  // Add remaining buttons if any
  if (rowComponents.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(rowComponents));
  }
  
  return rows;
}

export default {
  name: 'memory-match',
  aliases: ['memory', 'match'],
  description: 'Play a memory matching game! Find all the matching pairs of emojis.',
  async execute(message, args) {
    const userId = message.author.id;
    const gameId = `${userId}_${Date.now()}`;
    
    // Check if user already has an active game
    if (gameSessions.has(userId)) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Game Already Active\nYou already have an active Memory Match game. Finish that game first!`)
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
    
    // Create new game
    const board = createGameBoard(gameId);
    
    // Store game state
    const gameState = {
      id: gameId,
      board: board,
      revealed: [],
      matched: [],
      moves: 0,
      player: message.author,
      channelId: message.channel.id
    };
    
    gameSessions.set(userId, gameState);
    
    // Create game interface
    const container = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`## Memory Match Game\nMatch all the pairs of emojis!\n\n**Moves:** ${gameState.moves}\n**Pairs Found:** ${gameState.matched.length / 2}/8`)
      )
      .addSeparatorComponents()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`Click on the squares to reveal emojis. Find matching pairs!`)
      )
      .addSeparatorComponents()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`Good luck, ${message.author.tag}!`)
      );
    
    // Add game board buttons
    const buttonRows = createGameButtons(gameId, board, gameState.revealed, gameState.matched);
    buttonRows.forEach(row => container.addActionRowComponents(row));
    
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
    
    // Check if this is a game button click
    if (interaction.customId.startsWith(`memory_${gameState.id}_`)) {
      const index = parseInt(interaction.customId.split('_')[2]);
      
      // Ignore if card is already matched or already revealed
      if (gameState.matched.includes(index) || gameState.revealed.includes(index)) {
        return interaction.reply({ 
          content: 'This card is already revealed or matched!', 
          flags: [64] 
        });
      }
      
      // Reveal the card
      gameState.revealed.push(index);
      gameState.moves++;
      
      // If two cards are revealed, check for match
      if (gameState.revealed.length === 2) {
        const [firstIndex, secondIndex] = gameState.revealed;
        const firstEmoji = gameState.board[firstIndex];
        const secondEmoji = gameState.board[secondIndex];
        
        // Check for match
        if (firstEmoji === secondEmoji) {
          // Match found
          gameState.matched.push(firstIndex, secondIndex);
          
          // Check for win
          if (gameState.matched.length === 16) {
            // Game won
            const container = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`##  Congratulations! \nYou've matched all pairs!\n\n**Total Moves:** ${gameState.moves}\n**Perfect Score:** ${gameState.moves === 8 ? 'Yes! ' : 'No'}`)
              )
              .addSeparatorComponents()
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`Thanks for playing, ${interaction.user.tag}!`)
              );
            
            // Clean up game session
            gameSessions.delete(userId);
            
            return interaction.update({ 
              components: [container], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          }
          
          // Match found but game not over
          const container = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Memory Match Game\nGreat! You found a match!\n\n**Moves:** ${gameState.moves}\n**Pairs Found:** ${gameState.matched.length / 2}/8`)
            )
            .addSeparatorComponents()
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`Continue matching the remaining pairs!`)
            );
          
          // Add game board buttons
          const buttonRows = createGameButtons(gameState.id, gameState.board, [], gameState.matched);
          buttonRows.forEach(row => container.addActionRowComponents(row));
          
          return interaction.update({ 
            components: [container], 
            flags: [MessageFlags.IsComponentsV2] 
          });
        } else {
          // No match - hide cards after a delay
          const container = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Memory Match Game\nNo match! Try again.\n\n**Moves:** ${gameState.moves}\n**Pairs Found:** ${gameState.matched.length / 2}/8`)
            )
            .addSeparatorComponents()
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`Cards will be hidden in 2 seconds...`)
            );
          
          // Add game board buttons with both cards revealed
          const buttonRows = createGameButtons(gameState.id, gameState.board, gameState.revealed, gameState.matched);
          buttonRows.forEach(row => container.addActionRowComponents(row));
          
          await interaction.update({ 
            components: [container], 
            flags: [MessageFlags.IsComponentsV2] 
          });
          
          // Hide cards after 2 seconds
          setTimeout(async () => {
            // Check if game still exists
            if (!gameSessions.has(userId)) return;
            
            const updatedGameState = gameSessions.get(userId);
            
            // Hide the revealed cards
            updatedGameState.revealed = [];
            
            const updatedContainer = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Memory Match Game\nContinue matching the pairs!\n\n**Moves:** ${updatedGameState.moves}\n**Pairs Found:** ${updatedGameState.matched.length / 2}/8`)
              )
              .addSeparatorComponents()
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`Click on the squares to reveal emojis. Find matching pairs!`)
              );
            
            // Add game board buttons
            const updatedButtonRows = createGameButtons(updatedGameState.id, updatedGameState.board, updatedGameState.revealed, updatedGameState.matched);
            updatedButtonRows.forEach(row => updatedContainer.addActionRowComponents(row));
            
            try {
              await interaction.message.edit({ 
                components: [updatedContainer], 
                flags: [MessageFlags.IsComponentsV2] 
              });
            } catch (err) {
              console.error('Error updating game message:', err);
            }
          }, 2000);
          
          return;
        }
      } else {
        // First card revealed
        const container = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Memory Match Game\nFirst card revealed! Now find its match.\n\n**Moves:** ${gameState.moves}\n**Pairs Found:** ${gameState.matched.length / 2}/8`)
          )
          .addSeparatorComponents()
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`Click on another square to reveal the second card.`)
          );
        
        // Add game board buttons
        const buttonRows = createGameButtons(gameState.id, gameState.board, gameState.revealed, gameState.matched);
        buttonRows.forEach(row => container.addActionRowComponents(row));
        
        return interaction.update({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2] 
        });
      }
    }
  }
};