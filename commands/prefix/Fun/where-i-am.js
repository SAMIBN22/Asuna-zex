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

// Create 7 square buttons for hiding/finding (no text, neutral color)
function createSquareButtons(customIdPrefix) {
  const buttons = [];
  for (let i = 1; i <= 7; i++) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`${customIdPrefix}_${i}`)
        .setLabel('\u200b') // Zero-width space for empty label
        .setStyle(ButtonStyle.Secondary)
    );
  }
  return buttons;
}

export default {
  name: 'where-i-am',
  aliases: ['whereiam', 'hideandseek', 'wia'],
  description: 'Play a hide and seek game! Hide yourself in one of 7 squares and let your friends find you.',
  async execute(message, args) {
    const userId = message.author.id;
    
    // Check if user already has an active game
    if (gameSessions.has(userId)) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Game Already Active\nYou already have an active Where Am I game. Finish that game first!`)
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
    
    // Check if a user was mentioned or ID was provided
    let targetUser = null;
    if (message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first();
    } else if (args[0]) {
      try {
        targetUser = await message.client.users.fetch(args[0]);
      } catch (err) {
        // User not found
      }
    }
    
    // If no target user specified, the command user becomes the hider
    if (!targetUser) {
      targetUser = message.author;
    }
    
    // Can't play with bots
    if (targetUser.bot) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Invalid Player\nYou cannot play with bots!`)
        );
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
    
    // Can't play with yourself
    if (targetUser.id === message.author.id) {
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Playing Solo\nYou are the hider in this game! Choose a square to hide in below.`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
        );
      
      // Store game state
      gameSessions.set(userId, {
        type: 'solo',
        hider: message.author,
        seeker: null,
        channelId: message.channel.id,
        messageId: message.id,
        scores: { hider: 0, seeker: 0 },
        round: 1,
        hiddenSquare: null // Will be set when hider chooses a square
      });
      
      return message.reply({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }
    
    // Multiplayer game - command user is hider, mentioned user is seeker
    const container = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`## Where Am I Game\n**${message.author.tag}** is hiding!\n\n${targetUser.tag}, choose a square to hide in below.`)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
      );
    
    // Store game state (command user is hider, mentioned user is seeker)
    gameSessions.set(userId, {
      type: 'multiplayer',
      hider: message.author,
      seeker: targetUser,
      channelId: message.channel.id,
      messageId: message.id,
      scores: { hider: 0, seeker: 0 },
      round: 1,
      hiddenSquare: null // Will be set when hider chooses a square
    });
    
    gameSessions.set(targetUser.id, {
      type: 'multiplayer',
      hider: message.author,
      seeker: targetUser,
      channelId: message.channel.id,
      messageId: message.id,
      scores: { hider: 0, seeker: 0 },
      round: 1,
      hiddenSquare: null // Will be set when hider chooses a square
    });
    
    return message.reply({ 
      components: [container], 
      flags: [MessageFlags.IsComponentsV2] 
    });
  },
  
  // Handle button interactions for the game
  async interactionHandler(interaction) {
    const userId = interaction.user.id;
    
    // Handle square selection (hider choosing where to hide)
    if (interaction.customId.startsWith('whereiam_hide_')) {
      const squareNumber = parseInt(interaction.customId.split('_')[2]);
      
      // Validate game session
      if (!gameSessions.has(userId)) {
        // Check if this is the hider selecting a square in a multiplayer game
        let gameData = null;
        let hiderId = null;
        
        // Look for game sessions where this user is the hider
        for (const [id, session] of gameSessions.entries()) {
          if (session.hider.id === userId) {
            gameData = session;
            hiderId = id;
            break;
          }
        }
        
        if (!gameData) {
          return interaction.reply({ 
            content: 'Game session not found or expired!', 
            flags: [64] 
          });
        }
        
        // Set the hidden square
        gameData.hiddenSquare = squareNumber;
        
        // Update UI to show hider is hiding and directly show squares for seeker
        const container = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Where Am I Game\n**${gameData.hider.tag}** is hiding!\n\n${gameData.seeker ? gameData.seeker.tag : 'Someone'}, find them in one of the squares below!\n\n**Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}`)
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(createSquareButtons('whereiam_seek').slice(0, 4))
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(createSquareButtons('whereiam_seek').slice(4, 7))
          );
        
        await interaction.update({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2] 
        });
        
        // Start the 14-second timer for seeker to find the hider
        const timeout = setTimeout(async () => {
          // Check if game still exists
          if (!gameSessions.has(hiderId)) return;
          
          const updatedGameData = gameSessions.get(hiderId);
          
          // If we've reached this point, the seeker didn't find the hider in time
          updatedGameData.scores.hider += 1;
          
          // Check for winner (first to 3 points)
          if (updatedGameData.scores.hider >= 3) {
            // Hider wins
            const winContainer = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Game Over!\n**${updatedGameData.hider.tag}** wins the game!\n\n**Final Score:**\nHider: ${updatedGameData.scores.hider} | Seeker: ${updatedGameData.scores.seeker}\n\nCongratulations! `)
              );
            
            // Clean up game sessions
            gameSessions.delete(hiderId);
            if (updatedGameData.seeker) gameSessions.delete(updatedGameData.seeker.id);
            
            try {
              await interaction.message.edit({ 
                components: [winContainer], 
                flags: [MessageFlags.IsComponentsV2] 
              });
            } catch (err) {
              console.error('Error updating game message:', err);
            }
            return;
          }
          
          // Continue to next round
          updatedGameData.round += 1;
          
          // Update UI for next round
          const nextRoundContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Round ${updatedGameData.round}\n**${updatedGameData.hider.tag}** scored a point for hiding successfully!\n\n**Score:**\nHider: ${updatedGameData.scores.hider} | Seeker: ${updatedGameData.scores.seeker}\n\nNext round starting...`)
            );
          
          try {
            await interaction.message.edit({ 
              components: [nextRoundContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          } catch (err) {
            console.error('Error updating game message:', err);
          }
          
          // Start next round after 3 seconds
          setTimeout(async () => {
            if (!gameSessions.has(hiderId)) return;
            
            const nextGameData = gameSessions.get(hiderId);
            
            const newRoundContainer = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Round ${nextGameData.round} - New Hiding Spot!\n**${nextGameData.hider.tag}**, choose a square to hide in below.`)
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
              );
            
            try {
              await interaction.message.edit({ 
                components: [newRoundContainer], 
                flags: [MessageFlags.IsComponentsV2] 
              });
            } catch (err) {
              console.error('Error updating game message:', err);
            }
          }, 3000);
        }, 14000); // 14 second timer
        
        // Store timeout reference
        gameData.seekerTimeout = timeout;
        
        return;
      }
      
      const gameData = gameSessions.get(userId);
      
      // Validate it's the hider clicking the button
      if (gameData.hider.id !== userId) {
        return interaction.reply({ 
          content: 'Only the hider can choose where to hide!', 
          flags: [64] 
        });
      }
      
      // Set the hidden square
      gameData.hiddenSquare = squareNumber;
      
      // Update UI to show hider is hiding and directly show squares for seeker
      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## Where Am I Game\n**${gameData.hider.tag}** is hiding!\n\n${gameData.seeker ? gameData.seeker.tag : 'Someone'}, find them in one of the squares below!\n\n**Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(createSquareButtons('whereiam_seek').slice(0, 4))
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(createSquareButtons('whereiam_seek').slice(4, 7))
        );
      
      await interaction.update({ 
        components: [container], 
        flags: [MessageFlags.IsComponentsV2] 
      });
      
      // Start the 14-second timer for seeker to find the hider
      const timeout = setTimeout(async () => {
        // Check if game still exists
        if (!gameSessions.has(userId)) return;
        
        const updatedGameData = gameSessions.get(userId);
        
        // If we've reached this point, the seeker didn't find the hider in time
        updatedGameData.scores.hider += 1;
        
        // Check for winner (first to 3 points)
        if (updatedGameData.scores.hider >= 3) {
          // Hider wins
          const winContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Game Over!\n**${updatedGameData.hider.tag}** wins the game!\n\n**Final Score:**\nHider: ${updatedGameData.scores.hider} | Seeker: ${updatedGameData.scores.seeker}\n\nCongratulations! `)
            );
          
          // Clean up game sessions
          gameSessions.delete(userId);
          if (updatedGameData.seeker) gameSessions.delete(updatedGameData.seeker.id);
          
          try {
            await interaction.message.edit({ 
              components: [winContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          } catch (err) {
            console.error('Error updating game message:', err);
          }
          return;
        }
        
        // Continue to next round
        updatedGameData.round += 1;
        
        // Update UI for next round
        const nextRoundContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Round ${updatedGameData.round}\n**${updatedGameData.hider.tag}** scored a point for hiding successfully!\n\n**Score:**\nHider: ${updatedGameData.scores.hider} | Seeker: ${updatedGameData.scores.seeker}\n\nNext round starting...`)
          );
        
        try {
          await interaction.message.edit({ 
            components: [nextRoundContainer], 
            flags: [MessageFlags.IsComponentsV2] 
          });
        } catch (err) {
          console.error('Error updating game message:', err);
        }
        
        // Start next round after 3 seconds
        setTimeout(async () => {
          if (!gameSessions.has(userId)) return;
          
          const nextGameData = gameSessions.get(userId);
          
          const newRoundContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Round ${nextGameData.round} - New Hiding Spot!\n**${nextGameData.hider.tag}**, choose a square to hide in below.`)
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
            );
          
          try {
            await interaction.message.edit({ 
              components: [newRoundContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          } catch (err) {
            console.error('Error updating game message:', err);
          }
        }, 3000);
      }, 14000); // 14 second timer
      
      // Store timeout reference
      gameData.seekerTimeout = timeout;
      
      return;
    }
    
    // Handle seeker's square selection (trying to find the hider)
    if (interaction.customId.startsWith('whereiam_seek_')) {
      const selectedSquare = parseInt(interaction.customId.split('_')[2]);
      
      // Validate game session
      if (!gameSessions.has(userId)) {
        // Check if this is the seeker selecting a square in a multiplayer game
        let gameData = null;
        let hiderId = null;
        
        // Look for game sessions where this user is the seeker
        for (const [id, session] of gameSessions.entries()) {
          if (session.seeker && session.seeker.id === userId) {
            gameData = session;
            hiderId = id;
            break;
          }
        }
        
        if (!gameData) {
          return interaction.reply({ 
            content: 'Game session not found or expired!', 
            flags: [64] 
          });
        }
        
        // Clear the timeout since the seeker made a choice
        if (gameData.seekerTimeout) {
          clearTimeout(gameData.seekerTimeout);
        }
        
        // Check if the seeker found the hider
        if (selectedSquare === gameData.hiddenSquare) {
          // Seeker found the hider!
          gameData.scores.seeker += 1;
          
          // Check for winner (first to 3 points)
          if (gameData.scores.seeker >= 3) {
            // Seeker wins
            const winContainer = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Game Over!\n**${gameData.seeker ? gameData.seeker.tag : interaction.user.tag}** wins the game!\n\n**Final Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nCongratulations! `)
              );
            
            // Clean up game sessions
            gameSessions.delete(hiderId);
            if (gameData.hider) gameSessions.delete(gameData.hider.id);
            
            try {
              await interaction.update({ 
                components: [winContainer], 
                flags: [MessageFlags.IsComponentsV2] 
              });
            } catch (err) {
              console.error('Error updating game message:', err);
            }
            return;
          }
          
          // Continue to next round
          gameData.round += 1;
          
          // Update UI for next round
          const nextRoundContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Round ${gameData.round}\n**${gameData.seeker ? gameData.seeker.tag : interaction.user.tag}** scored a point for finding ${gameData.hider.tag}!\n\n**Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nNext round starting...`)
            );
          
          await interaction.update({ 
            components: [nextRoundContainer], 
            flags: [MessageFlags.IsComponentsV2] 
          });
          
          // Start next round after 3 seconds
          setTimeout(async () => {
            if (!gameSessions.has(hiderId)) return;
            
            const nextGameData = gameSessions.get(hiderId);
            
            const newRoundContainer = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Round ${nextGameData.round} - New Hiding Spot!\n**${nextGameData.hider.tag}**, choose a square to hide in below.`)
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
              );
            
            try {
              await interaction.message.edit({ 
                components: [newRoundContainer], 
                flags: [MessageFlags.IsComponentsV2] 
              });
            } catch (err) {
              console.error('Error updating game message:', err);
            }
          }, 3000);
          
          return;
        } else {
          // Seeker didn't find the hider - hider gets a point
          gameData.scores.hider += 1;
          
          // Check for winner (first to 3 points)
          if (gameData.scores.hider >= 3) {
            // Hider wins
            const winContainer = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Game Over!\n**${gameData.hider.tag}** wins the game!\n\n**Final Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nCongratulations! `)
              );
            
            // Clean up game sessions
            gameSessions.delete(hiderId);
            if (gameData.seeker) gameSessions.delete(gameData.seeker.id);
            
            try {
              await interaction.update({ 
                components: [winContainer], 
                flags: [MessageFlags.IsComponentsV2] 
              });
            } catch (err) {
              console.error('Error updating game message:', err);
            }
            return;
          }
          
          // Continue to next round
          gameData.round += 1;
          
          // Update UI for next round
          const nextRoundContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Round ${gameData.round}\n**${gameData.hider.tag}** scored a point because **${gameData.seeker ? gameData.seeker.tag : interaction.user.tag}** chose the wrong square!\n\n**Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nNext round starting...`)
            );
          
          await interaction.update({ 
            components: [nextRoundContainer], 
            flags: [MessageFlags.IsComponentsV2] 
          });
          
          // Start next round after 3 seconds
          setTimeout(async () => {
            if (!gameSessions.has(hiderId)) return;
            
            const nextGameData = gameSessions.get(hiderId);
            
            const newRoundContainer = new ContainerBuilder()
              .setAccentColor(0xFFFFFF)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Round ${nextGameData.round} - New Hiding Spot!\n**${nextGameData.hider.tag}**, choose a square to hide in below.`)
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
              );
            
            try {
              await interaction.message.edit({ 
                components: [newRoundContainer], 
                flags: [MessageFlags.IsComponentsV2] 
              });
            } catch (err) {
              console.error('Error updating game message:', err);
            }
          }, 3000);
          
          return;
        }
      }
      
      const gameData = gameSessions.get(userId);
      
      // Clear the timeout since the seeker made a choice
      if (gameData.seekerTimeout) {
        clearTimeout(gameData.seekerTimeout);
      }
      
      // Check if the seeker found the hider
      if (selectedSquare === gameData.hiddenSquare) {
        // Seeker found the hider!
        gameData.scores.seeker += 1;
        
        // Check for winner (first to 3 points)
        if (gameData.scores.seeker >= 3) {
          // Seeker wins
          const winContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Game Over!\n**${gameData.seeker ? gameData.seeker.tag : interaction.user.tag}** wins the game!\n\n**Final Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nCongratulations! `)
            );
          
          // Clean up game sessions
          gameSessions.delete(userId);
          if (gameData.hider) gameSessions.delete(gameData.hider.id);
          
          try {
            await interaction.update({ 
              components: [winContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          } catch (err) {
            console.error('Error updating game message:', err);
          }
          return;
        }
        
        // Continue to next round
        gameData.round += 1;
        
        // Update UI for next round
        const nextRoundContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Round ${gameData.round}\n**${gameData.seeker ? gameData.seeker.tag : interaction.user.tag}** scored a point for finding ${gameData.hider.tag}!\n\n**Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nNext round starting...`)
          );
        
        await interaction.update({ 
          components: [nextRoundContainer], 
          flags: [MessageFlags.IsComponentsV2] 
        });
        
        // Start next round after 3 seconds
        setTimeout(async () => {
          if (!gameSessions.has(userId)) return;
          
          const nextGameData = gameSessions.get(userId);
          
          const newRoundContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Round ${nextGameData.round} - New Hiding Spot!\n**${nextGameData.hider.tag}**, choose a square to hide in below.`)
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
            );
          
          try {
            await interaction.message.edit({ 
              components: [newRoundContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          } catch (err) {
            console.error('Error updating game message:', err);
          }
        }, 3000);
        
        return;
      } else {
        // Seeker didn't find the hider - hider gets a point
        gameData.scores.hider += 1;
        
        // Check for winner (first to 3 points)
        if (gameData.scores.hider >= 3) {
          // Hider wins
          const winContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Game Over!\n**${gameData.hider.tag}** wins the game!\n\n**Final Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nCongratulations! `)
            );
          
          // Clean up game sessions
          gameSessions.delete(userId);
          if (gameData.seeker) gameSessions.delete(gameData.seeker.id);
          
          try {
            await interaction.update({ 
              components: [winContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          } catch (err) {
            console.error('Error updating game message:', err);
          }
          return;
        }
        
        // Continue to next round
        gameData.round += 1;
        
        // Update UI for next round
        const nextRoundContainer = new ContainerBuilder()
          .setAccentColor(0xFFFFFF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Round ${gameData.round}\n**${gameData.hider.tag}** scored a point because **${gameData.seeker ? gameData.seeker.tag : interaction.user.tag}** chose the wrong square!\n\n**Score:**\nHider: ${gameData.scores.hider} | Seeker: ${gameData.scores.seeker}\n\nNext round starting...`)
          );
        
        await interaction.update({ 
          components: [nextRoundContainer], 
          flags: [MessageFlags.IsComponentsV2] 
        });
        
        // Start next round after 3 seconds
        setTimeout(async () => {
          if (!gameSessions.has(userId)) return;
          
          const nextGameData = gameSessions.get(userId);
          
          const newRoundContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## Round ${nextGameData.round} - New Hiding Spot!\n**${nextGameData.hider.tag}**, choose a square to hide in below.`)
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(0, 4))
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(createSquareButtons('whereiam_hide').slice(4, 7))
            );
          
          try {
            await interaction.message.edit({ 
              components: [newRoundContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
          } catch (err) {
            console.error('Error updating game message:', err);
          }
        }, 3000);
        
        return;
      }
    }
  }
};