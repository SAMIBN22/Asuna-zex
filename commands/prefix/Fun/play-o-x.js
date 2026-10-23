import { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js'

// Game state storage
const gameSessions = new Map();

// AI difficulty levels
const DIFFICULTY_LEVELS = {
    low: 'low',
    medium: 'medium',
    hard: 'hard'
};

// Tic Tac Toe game class
class TicTacToeGame {
    constructor(player1, player2 = null, difficulty = null) {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.player1 = player1; // Human player
        this.player2 = player2; // Human opponent or null for AI
        this.difficulty = difficulty; // AI difficulty level
        this.gameOver = false;
        this.winner = null;
    }

    // Make a move
    makeMove(position, player) {
        if (this.gameOver || this.board[position] !== null) {
            return false;
        }

        if (player !== this.currentPlayer) {
            return false;
        }

        this.board[position] = player;
        this.checkGameStatus();
        
        if (!this.gameOver) {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        }
        
        return true;
    }

    // Check game status (win, draw, ongoing)
    checkGameStatus() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                this.gameOver = true;
                this.winner = this.board[a];
                return;
            }
        }

        if (this.board.every(cell => cell !== null)) {
            this.gameOver = true;
            this.winner = 'draw';
        }
    }

    // AI move based on difficulty
    makeAIMove() {
        if (this.gameOver || this.currentPlayer !== 'O') {
            return null;
        }

        let move;
        switch (this.difficulty) {
            case 'hard':
                move = this.getBestMove();
                break;
            case 'medium':
                // 70% chance of best move, 30% random
                move = Math.random() < 0.7 ? this.getBestMove() : this.getRandomMove();
                break;
            case 'low':
            default:
                move = this.getRandomMove();
                break;
        }

        if (move !== null) {
            this.makeMove(move, 'O');
        }
        return move;
    }

    // Get best move using minimax algorithm
    getBestMove() {
        // Simple implementation - find winning move or block opponent
        // Check for winning move
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === null) {
                this.board[i] = 'O';
                if (this.checkWin('O')) {
                    this.board[i] = null;
                    return i;
                }
                this.board[i] = null;
            }
        }

        // Check for blocking move
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === null) {
                this.board[i] = 'X';
                if (this.checkWin('X')) {
                    this.board[i] = null;
                    return i;
                }
                this.board[i] = null;
            }
        }

        // Center is preferred
        if (this.board[4] === null) {
            return 4;
        }

        // Corners are preferred
        const corners = [0, 2, 6, 8];
        const availableCorners = corners.filter(i => this.board[i] === null);
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }

        // Return random available move
        return this.getRandomMove();
    }

    // Check if a player has won
    checkWin(player) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] === player && this.board[b] === player && this.board[c] === player) {
                return true;
            }
        }
        return false;
    }

    // Get a random available move
    getRandomMove() {
        const availableMoves = this.board
            .map((cell, index) => cell === null ? index : null)
            .filter(index => index !== null);
        
        if (availableMoves.length === 0) {
            return null;
        }
        
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Get board display
    getBoardDisplay() {
        let display = '';
        for (let i = 0; i < 9; i++) {
            const cell = this.board[i] || (i + 1).toString();
            display += ` ${cell} `;
            if (i % 3 === 2) {
                display += '\n';
            } else {
                display += '|';
            }
        }
        return display;
    }
}

// Create game board buttons
function createGameButtons(game) {
    const buttons = [];
    for (let i = 0; i < 9; i++) {
        const cellValue = game.board[i];
        let label = cellValue || (i + 1).toString();
        let style = ButtonStyle.Secondary;
        let disabled = !!cellValue || game.gameOver;

        if (cellValue === 'X') {
            style = ButtonStyle.Primary;
        } else if (cellValue === 'O') {
            style = ButtonStyle.Danger;
        }

        buttons.push(
            new ButtonBuilder()
                .setCustomId(`tictactoe_${i}`)
                .setLabel(label)
                .setStyle(style)
                .setDisabled(disabled)
        );
    }
    return buttons;
}

// Create difficulty selection buttons
function createDifficultyButtons() {
    return [
        new ButtonBuilder()
            .setCustomId('tictactoe_difficulty_low')
            .setLabel('Low')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('tictactoe_difficulty_medium')
            .setLabel('Medium')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('tictactoe_difficulty_hard')
            .setLabel('Hard')
            .setStyle(ButtonStyle.Danger)
    ];
}

export default {
    name: 'play-o-x',
    description: 'Play Tic-Tac-Toe (X-O) game with the bot or another player!',
    aliases: ['tictactoe', 'xo'],
    execute: async (message, args) => {
        const userId = message.author.id;
        
        // Check if user already has an active game
        if (gameSessions.has(userId)) {
            const container = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`## Game Already Active\nYou already have an active Tic-Tac-Toe game. Finish that game first!`)
                );
            
            return message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });
        }

        // Check if mentioned another user to play against
        const mentionedUser = message.mentions.users.first();
        
        if (mentionedUser) {
            // Check if mentioned user is the bot itself
            if (mentionedUser.bot && mentionedUser.id === message.client.user.id) {
                // Play against bot - ask for difficulty level
                const container = new ContainerBuilder()
                    .setAccentColor(0xFFFFFF)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## Play Against Bot\nPlease select the difficulty level:`)
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(createDifficultyButtons())
                    );
                
                const reply = await message.reply({ 
                    components: [container], 
                    flags: [MessageFlags.IsComponentsV2] 
                });
                
                // Store game state temporarily
                gameSessions.set(userId, {
                    type: 'bot_selection',
                    message: reply,
                    player: message.author
                });
            } else if (mentionedUser.bot) {
                // Cannot play against other bots
                const container = new ContainerBuilder()
                    .setAccentColor(0xFFFFFF)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## Invalid Opponent\nYou cannot play against other bots. Please mention a human player or play against me!`)
                    );
                
                return message.reply({ 
                    components: [container], 
                    flags: [MessageFlags.IsComponentsV2] 
                });
            } else if (mentionedUser.id === message.author.id) {
                // Cannot play against yourself
                const container = new ContainerBuilder()
                    .setAccentColor(0xFFFFFF)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## Invalid Opponent\nYou cannot play against yourself. Please mention another player or play against me!`)
                    );
                
                return message.reply({ 
                    components: [container], 
                    flags: [MessageFlags.IsComponentsV2] 
                });
            } else {
                // Play against mentioned user
                // Check if mentioned user already has a game
                if (gameSessions.has(mentionedUser.id)) {
                    const container = new ContainerBuilder()
                        .setAccentColor(0xFFFFFF)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(`## Player Busy\n${mentionedUser.tag} already has an active game. They need to finish it first!`)
                        );
                    
                    return message.reply({ 
                        components: [container], 
                        flags: [MessageFlags.IsComponentsV2] 
                    });
                }
                
                // Create game between two players
                const game = new TicTacToeGame(message.author, mentionedUser);
                gameSessions.set(userId, { 
                    type: 'multiplayer', 
                    game, 
                    channelId: message.channel.id,
                    player1Message: message 
                });
                gameSessions.set(mentionedUser.id, { 
                    type: 'multiplayer', 
                    game, 
                    channelId: message.channel.id,
                    player2Message: message 
                });
                
                // Create game board
                const container = new ContainerBuilder()
                    .setAccentColor(0xFFFFFF)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## Tic-Tac-Toe Game\n**${message.author.tag} (X)** vs **${mentionedUser.tag} (O)**\n\nCurrent Turn: **${message.author.tag}**\n\n${game.getBoardDisplay()}`)
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(createGameButtons(game).slice(0, 3))
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(createGameButtons(game).slice(3, 6))
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(createGameButtons(game).slice(6, 9))
                    );
                
                await message.reply({ 
                    components: [container], 
                    flags: [MessageFlags.IsComponentsV2] 
                });
            }
        } else {
            // No opponent mentioned - play against bot, ask for difficulty
            const container = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`## Play Against Bot\nPlease select the difficulty level:`)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(createDifficultyButtons())
                );
            
            const reply = await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });
            
            // Store game state temporarily
            gameSessions.set(userId, {
                type: 'bot_selection',
                message: reply,
                player: message.author
            });
        }
    }
};

// Handle button interactions for the game
export const handleInteraction = async (interaction) => {
    const userId = interaction.user.id;
    
    if (interaction.customId.startsWith('tictactoe_difficulty_')) {
        // Handle difficulty selection
        if (!gameSessions.has(userId) || gameSessions.get(userId).type !== 'bot_selection') {
            return interaction.reply({ 
                content: 'Invalid game session.', 
                flags: [64] 
            });
        }
        
        const difficulty = interaction.customId.replace('tictactoe_difficulty_', '');
        const gameData = gameSessions.get(userId);
        
        // Create game against bot
        const game = new TicTacToeGame(interaction.user, null, difficulty);
        gameSessions.set(userId, { 
            type: 'singleplayer', 
            game, 
            channelId: interaction.channel.id,
            message: gameData.message
        });
        
        // Create game board
        const container = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`## Tic-Tac-Toe Game\n**${interaction.user.tag} (X)** vs **Bot (O)**\nDifficulty: **${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}**\n\nCurrent Turn: **${interaction.user.tag}**\n\n${game.getBoardDisplay()}`)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(createGameButtons(game).slice(0, 3))
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(createGameButtons(game).slice(3, 6))
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(createGameButtons(game).slice(6, 9))
            );
        
        await interaction.update({ 
            components: [container], 
            flags: [MessageFlags.IsComponentsV2] 
        });
        
        return;
    }
    
    if (interaction.customId.startsWith('tictactoe_')) {
        // Handle game move
        if (!gameSessions.has(userId)) {
            return interaction.reply({ 
                content: 'You are not in a game.', 
                flags: [64] 
            });
        }
        
        const gameData = gameSessions.get(userId);
        const game = gameData.game;
        
        // Validate it's the player's turn
        if ((gameData.type === 'singleplayer' && game.currentPlayer === 'O') || 
            (gameData.type === 'multiplayer' && 
             ((game.currentPlayer === 'X' && interaction.user.id !== game.player1.id) ||
              (game.currentPlayer === 'O' && game.player2 && interaction.user.id !== game.player2.id)))) {
            return interaction.reply({ 
                content: 'It\'s not your turn!', 
                flags: [64] 
            });
        }
        
        // Get move position
        const position = parseInt(interaction.customId.replace('tictactoe_', ''));
        
        // Make move
        if (!game.makeMove(position, game.currentPlayer)) {
            return interaction.reply({ 
                content: 'Invalid move!', 
                flags: [64] 
            });
        }
        
        // Check if game is over
        if (game.gameOver) {
            let resultText;
            if (game.winner === 'draw') {
                resultText = 'It\'s a draw!';
            } else if (game.winner === 'X') {
                resultText = gameData.type === 'singleplayer' ? 
                    `**${interaction.user.tag}** wins! ` : 
                    `**${game.player1.tag}** wins! `;
            } else {
                resultText = gameData.type === 'singleplayer' ? 
                    '**Bot** wins! ' : 
                    `**${game.player2.tag}** wins! `;
            }
            
            // Update board with result
            const container = new ContainerBuilder()
                .setAccentColor(game.winner === 'draw' ? 0xFFFF00 : 
                               (game.winner === 'X' ? 0x00FF00 : 0xFFFFFF))
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`## Game Over\n${resultText}\n\n${game.getBoardDisplay()}`)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(createGameButtons(game).slice(0, 3))
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(createGameButtons(game).slice(3, 6))
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(createGameButtons(game).slice(6, 9))
                );
            
            // Clean up game sessions
            if (gameData.type === 'singleplayer') {
                gameSessions.delete(userId);
            } else {
                gameSessions.delete(game.player1.id);
                if (game.player2) {
                    gameSessions.delete(game.player2.id);
                }
            }
            
            return interaction.update({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });
        }
        
        // If playing against bot and it's bot's turn
        if (gameData.type === 'singleplayer' && game.currentPlayer === 'O') {
            // Make AI move
            game.makeAIMove();
            
            // Check if game is over after AI move
            if (game.gameOver) {
                let resultText;
                if (game.winner === 'draw') {
                    resultText = 'It\'s a draw!';
                } else if (game.winner === 'X') {
                    resultText = `**${interaction.user.tag}** wins! `;
                } else {
                    resultText = '**Bot** wins! ';
                }
                
                // Update board with result
                const container = new ContainerBuilder()
                    .setAccentColor(game.winner === 'draw' ? 0xFFFF00 : 
                                   (game.winner === 'X' ? 0x00FF00 : 0xFFFFFF))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## Game Over\n${resultText}\n\n${game.getBoardDisplay()}`)
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(createGameButtons(game).slice(0, 3))
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(createGameButtons(game).slice(3, 6))
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(createGameButtons(game).slice(6, 9))
                    );
                
                // Clean up game session
                gameSessions.delete(userId);
                
                return interaction.update({ 
                    components: [container], 
                    flags: [MessageFlags.IsComponentsV2] 
                });
            }
        }
        
        // Update game board
        let currentTurnText;
        if (gameData.type === 'singleplayer') {
            currentTurnText = game.currentPlayer === 'X' ? 
                `**${interaction.user.tag}**` : '**Bot**';
        } else {
            currentTurnText = game.currentPlayer === 'X' ? 
                `**${game.player1.tag}**` : `**${game.player2.tag}**`;
        }
        
        const container = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`## Tic-Tac-Toe Game\n${gameData.type === 'singleplayer' ? 
                        `**${interaction.user.tag} (X)** vs **Bot (O)**\nDifficulty: **${game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1)}**` : 
                        `**${game.player1.tag} (X)** vs **${game.player2.tag} (O)**`}\n\nCurrent Turn: ${currentTurnText}\n\n${game.getBoardDisplay()}`)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(createGameButtons(game).slice(0, 3))
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(createGameButtons(game).slice(3, 6))
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(createGameButtons(game).slice(6, 9))
            );
        
        await interaction.update({ 
            components: [container], 
            flags: [MessageFlags.IsComponentsV2] 
        });
    }
};