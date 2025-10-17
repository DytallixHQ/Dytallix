#!/usr/bin/env node

/**
 * Web3 Game Economy Example
 * 
 * This example demonstrates how to build a Web3 game with an in-game
 * token economy powered by Dytallix blockchain.
 */

import { DytallixClient } from '../../dytallix-fast-launch/sdk/src/client.js';
import { createWallet } from '../../dytallix-fast-launch/sdk/src/wallet.js';

class GameEconomy {
  constructor(config) {
    this.config = config;
    this.sdk = new DytallixClient({
      rpcUrl: config.rpcUrl,
      chainId: 'dyt-local-1'
    });
    
    this.gameWallet = null;
    this.players = new Map();
    this.gameState = {
      totalPlayers: 0,
      totalTokensIssued: 0,
      totalTransactions: 0,
      leaderboard: []
    };
  }

  async initialize() {
    console.log('🎮 Initializing Web3 Game Economy...');
    
    // Create or load game treasury wallet
    this.gameWallet = await createWallet('dilithium5', this.config.gameWalletPassword);
    console.log(`🏦 Game Treasury Wallet: ${this.gameWallet.address}`);
    
    // Fund the game wallet
    console.log('💰 Funding game treasury from faucet...');
    await this.sdk.requestFromFaucet(this.gameWallet.address, '10000000'); // 10M tokens
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const balance = await this.sdk.getBalance(this.gameWallet.address);
    console.log('🏦 Game Treasury Balance:', balance);
    
    console.log('✅ Game Economy initialized');
  }

  async createPlayer(playerName) {
    try {
      console.log(`👤 Creating new player: ${playerName}`);
      
      // Create wallet for player
      const playerWallet = await createWallet('dilithium5');
      
      const player = {
        name: playerName,
        wallet: playerWallet,
        address: playerWallet.address,
        stats: {
          level: 1,
          experience: 0,
          gamesPlayed: 0,
          tokensEarned: 0,
          tokensSpent: 0,
          achievements: [],
          joinedAt: new Date().toISOString()
        }
      };
      
      this.players.set(playerWallet.address, player);
      this.gameState.totalPlayers++;
      
      // Give welcome bonus
      await this.giveWelcomeBonus(player);
      
      console.log(`✅ Player ${playerName} created with address: ${playerWallet.address}`);
      return player;
      
    } catch (error) {
      console.error(`❌ Failed to create player ${playerName}:`, error.message);
      throw error;
    }
  }

  async giveWelcomeBonus(player) {
    const welcomeBonus = '1000'; // 1000 game tokens
    
    try {
      console.log(`🎁 Giving welcome bonus to ${player.name}: ${welcomeBonus} tokens`);
      
      await this.sdk.sendTokens(
        this.gameWallet.keystore,
        this.config.gameWalletPassword,
        player.address,
        welcomeBonus,
        'DGT',
        `Welcome bonus for player ${player.name}`
      );
      
      player.stats.tokensEarned += parseFloat(welcomeBonus);
      this.gameState.totalTokensIssued += parseFloat(welcomeBonus);
      this.gameState.totalTransactions++;
      
      console.log(`✅ Welcome bonus sent to ${player.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to send welcome bonus:`, error.message);
    }
  }

  async playGame(playerAddress, gameType = 'battle') {
    const player = this.players.get(playerAddress);
    if (!player) {
      throw new Error('Player not found');
    }
    
    console.log(`🎯 ${player.name} is playing ${gameType}...`);
    
    // Simulate game mechanics
    const gameResult = this.simulateGame(gameType);
    
    // Update player stats
    player.stats.gamesPlayed++;
    player.stats.experience += gameResult.experienceGained;
    
    // Check for level up
    const newLevel = Math.floor(player.stats.experience / 1000) + 1;
    if (newLevel > player.stats.level) {
      player.stats.level = newLevel;
      console.log(`🆙 ${player.name} leveled up to level ${newLevel}!`);
      await this.rewardLevelUp(player);
    }
    
    // Reward tokens based on performance
    if (gameResult.tokensEarned > 0) {
      await this.rewardTokens(player, gameResult.tokensEarned, `Reward for ${gameType} game`);
    }
    
    // Check for achievements
    await this.checkAchievements(player);
    
    // Update leaderboard
    this.updateLeaderboard();
    
    console.log(`🎮 Game completed! ${player.name} earned ${gameResult.tokensEarned} tokens and ${gameResult.experienceGained} XP`);
    
    return gameResult;
  }

  simulateGame(gameType) {
    // Simple game simulation with random outcomes
    const difficulty = Math.random();
    const performance = Math.random();
    
    let tokensEarned = 0;
    let experienceGained = 0;
    let outcome = 'loss';
    
    if (performance > 0.7) {
      // Excellent performance
      outcome = 'victory';
      tokensEarned = Math.floor(100 + (difficulty * 200)); // 100-300 tokens
      experienceGained = Math.floor(50 + (difficulty * 100)); // 50-150 XP
    } else if (performance > 0.4) {
      // Good performance
      outcome = 'draw';
      tokensEarned = Math.floor(30 + (difficulty * 70)); // 30-100 tokens
      experienceGained = Math.floor(20 + (difficulty * 40)); // 20-60 XP
    } else {
      // Poor performance
      outcome = 'loss';
      tokensEarned = Math.floor(10 + (difficulty * 20)); // 10-30 tokens
      experienceGained = Math.floor(5 + (difficulty * 15)); // 5-20 XP
    }
    
    return {
      gameType,
      outcome,
      tokensEarned,
      experienceGained,
      difficulty: Math.round(difficulty * 100),
      performance: Math.round(performance * 100)
    };
  }

  async rewardTokens(player, amount, memo) {
    try {
      await this.sdk.sendTokens(
        this.gameWallet.keystore,
        this.config.gameWalletPassword,
        player.address,
        amount.toString(),
        'DGT',
        memo
      );
      
      player.stats.tokensEarned += amount;
      this.gameState.totalTokensIssued += amount;
      this.gameState.totalTransactions++;
      
    } catch (error) {
      console.error(`❌ Failed to reward tokens to ${player.name}:`, error.message);
    }
  }

  async rewardLevelUp(player) {
    const levelBonus = player.stats.level * 100; // 100 tokens per level
    await this.rewardTokens(player, levelBonus, `Level ${player.stats.level} bonus`);
    
    // Add level-up achievement
    player.stats.achievements.push({
      type: 'level_up',
      level: player.stats.level,
      timestamp: new Date().toISOString()
    });
  }

  async checkAchievements(player) {
    const achievements = [];
    
    // First game achievement
    if (player.stats.gamesPlayed === 1) {
      achievements.push({ type: 'first_game', reward: 50 });
    }
    
    // Games milestone achievements
    if (player.stats.gamesPlayed === 10) {
      achievements.push({ type: 'veteran_player', reward: 500 });
    }
    
    if (player.stats.gamesPlayed === 100) {
      achievements.push({ type: 'hardcore_gamer', reward: 2000 });
    }
    
    // Token earning achievements
    if (player.stats.tokensEarned >= 10000 && !player.stats.achievements.find(a => a.type === 'token_collector')) {
      achievements.push({ type: 'token_collector', reward: 1000 });
    }
    
    // Process new achievements
    for (const achievement of achievements) {
      if (!player.stats.achievements.find(a => a.type === achievement.type)) {
        console.log(`🏆 ${player.name} unlocked achievement: ${achievement.type}`);
        
        player.stats.achievements.push({
          ...achievement,
          timestamp: new Date().toISOString()
        });
        
        if (achievement.reward > 0) {
          await this.rewardTokens(player, achievement.reward, `Achievement reward: ${achievement.type}`);
        }
      }
    }
  }

  async purchaseItem(playerAddress, itemId, price) {
    const player = this.players.get(playerAddress);
    if (!player) {
      throw new Error('Player not found');
    }
    
    console.log(`🛒 ${player.name} is purchasing item ${itemId} for ${price} tokens`);
    
    // Check player balance
    const balance = await this.sdk.getBalance(player.address);
    const dgtBalance = balance.find(b => b.denom === 'DGT');
    
    if (!dgtBalance || parseFloat(dgtBalance.amount) < price) {
      throw new Error('Insufficient balance');
    }
    
    // Simulate item purchase (send tokens to game treasury)
    await this.sdk.sendTokens(
      player.wallet.keystore,
      '', // No password for this demo
      this.gameWallet.address,
      price.toString(),
      'DGT',
      `Purchase item ${itemId}`
    );
    
    player.stats.tokensSpent += price;
    this.gameState.totalTransactions++;
    
    console.log(`✅ ${player.name} purchased item ${itemId}`);
    
    return {
      itemId,
      price,
      purchasedAt: new Date().toISOString()
    };
  }

  updateLeaderboard() {
    const playerList = Array.from(this.players.values());
    
    this.gameState.leaderboard = playerList
      .sort((a, b) => {
        // Sort by level first, then by experience
        if (b.stats.level !== a.stats.level) {
          return b.stats.level - a.stats.level;
        }
        return b.stats.experience - a.stats.experience;
      })
      .slice(0, 10) // Top 10
      .map((player, index) => ({
        rank: index + 1,
        name: player.name,
        address: player.address.substring(0, 10) + '...',
        level: player.stats.level,
        experience: player.stats.experience,
        tokensEarned: player.stats.tokensEarned
      }));
  }

  async getPlayerStats(playerAddress) {
    const player = this.players.get(playerAddress);
    if (!player) {
      throw new Error('Player not found');
    }
    
    const balance = await this.sdk.getBalance(player.address);
    
    return {
      name: player.name,
      address: player.address,
      balance,
      stats: player.stats
    };
  }

  getGameStats() {
    return {
      ...this.gameState,
      activePlayers: this.players.size
    };
  }

  async simulateGameSession() {
    console.log('\n🎮 Starting simulated game session...\n');
    
    // Create some players
    const players = [
      await this.createPlayer('Alice'),
      await this.createPlayer('Bob'),
      await this.createPlayer('Charlie')
    ];
    
    console.log('\n🕹️ Players start gaming...\n');
    
    // Simulate multiple game rounds
    for (let round = 1; round <= 5; round++) {
      console.log(`\n--- Round ${round} ---`);
      
      for (const player of players) {
        await this.playGame(player.address, 'battle');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Show final stats
    console.log('\n📊 Final Game Statistics:');
    console.log('=======================');
    
    for (const player of players) {
      const stats = await this.getPlayerStats(player.address);
      console.log(`\n👤 ${stats.name}:`);
      console.log(`   Level: ${stats.stats.level}`);
      console.log(`   Experience: ${stats.stats.experience}`);
      console.log(`   Games Played: ${stats.stats.gamesPlayed}`);
      console.log(`   Tokens Earned: ${stats.stats.tokensEarned}`);
      console.log(`   Achievements: ${stats.stats.achievements.length}`);
      console.log(`   Balance:`, stats.balance);
    }
    
    console.log('\n🏆 Leaderboard:');
    this.gameState.leaderboard.forEach(entry => {
      console.log(`   ${entry.rank}. ${entry.name} - Level ${entry.level} (${entry.experience} XP)`);
    });
    
    console.log('\n🎯 Overall Game Stats:', this.getGameStats());
  }
}

// Configuration
const config = {
  rpcUrl: 'http://localhost:26657',
  apiUrl: 'http://localhost:1317',
  faucetUrl: 'http://localhost:8080/dev/faucet',
  gameWalletPassword: 'game-treasury-password'
};

// Main execution
async function main() {
  console.log('🔥 Dytallix Web3 Game Economy Demo');
  console.log('==================================');
  
  const game = new GameEconomy(config);
  
  try {
    await game.initialize();
    await game.simulateGameSession();
    
  } catch (error) {
    console.error('❌ Game demo failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
