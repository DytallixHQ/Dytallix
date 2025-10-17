#!/usr/bin/env node

/**
 * DeFi Trading Bot Example
 * 
 * This example demonstrates how to build a simple DeFi trading bot
 * that monitors token prices and executes trades automatically.
 */

import { DytallixClient } from '../../dytallix-fast-launch/sdk/src/client.js';
import { createWallet } from '../../dytallix-fast-launch/sdk/src/wallet.js';

class DeFiTradingBot {
  constructor(config) {
    this.config = config;
    this.sdk = new DytallixClient({
      rpcUrl: config.rpcUrl,
      chainId: 'dyt-local-1'
    });
    
    this.wallet = null;
    this.isTrading = false;
    this.positions = new Map();
    this.priceHistory = new Map();
  }

  async initialize() {
    console.log('🤖 Initializing DeFi Trading Bot...');
    
    // Load or create wallet
    if (this.config.walletKeystore) {
      this.wallet = { 
        keystore: this.config.walletKeystore,
        address: this.config.walletKeystore.address 
      };
      console.log(`📊 Loaded wallet: ${this.wallet.address}`);
    } else {
      this.wallet = await createWallet('dilithium5', this.config.walletPassword);
      console.log(`🆕 Created new wallet: ${this.wallet.address}`);
      
      // Fund the wallet with testnet tokens
      console.log('💰 Funding wallet from faucet...');
      await this.sdk.requestFromFaucet(this.wallet.address);
      
      // Wait for funding to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Check initial balance
    await this.checkBalance();
    
    console.log('✅ Trading bot initialized');
  }

  async checkBalance() {
    try {
      const balance = await this.sdk.getBalance(this.wallet.address);
      console.log('💼 Current Balance:', balance);
      return balance;
    } catch (error) {
      console.error('❌ Failed to check balance:', error.message);
      return [];
    }
  }

  // Simulate price oracle (in real app, connect to actual price feeds)
  async getPrice(tokenPair) {
    // Simulate price fluctuation
    const basePrice = this.config.basePrices[tokenPair] || 1.0;
    const volatility = 0.05; // 5% volatility
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;
    const price = basePrice * randomFactor;
    
    // Store price history
    if (!this.priceHistory.has(tokenPair)) {
      this.priceHistory.set(tokenPair, []);
    }
    
    const history = this.priceHistory.get(tokenPair);
    history.push({ price, timestamp: Date.now() });
    
    // Keep only last 100 prices
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    return price;
  }

  // Calculate moving average
  getMovingAverage(tokenPair, periods = 20) {
    const history = this.priceHistory.get(tokenPair) || [];
    if (history.length < periods) return null;
    
    const recent = history.slice(-periods);
    const sum = recent.reduce((acc, item) => acc + item.price, 0);
    return sum / periods;
  }

  // Simple trading strategy: Buy low, sell high with moving average
  async analyzeAndTrade(tokenPair) {
    try {
      const currentPrice = await this.getPrice(tokenPair);
      const movingAverage = this.getMovingAverage(tokenPair);
      
      if (!movingAverage) {
        console.log(`📊 ${tokenPair}: Building price history... Current: $${currentPrice.toFixed(4)}`);
        return;
      }
      
      const position = this.positions.get(tokenPair);
      const priceVsMA = (currentPrice - movingAverage) / movingAverage;
      
      console.log(`📊 ${tokenPair}: $${currentPrice.toFixed(4)} (MA: $${movingAverage.toFixed(4)}, ${(priceVsMA * 100).toFixed(2)}%)`);
      
      // Buy signal: Price is 2% below moving average and we don't have a position
      if (priceVsMA < -0.02 && !position) {
        await this.executeBuy(tokenPair, currentPrice);
      }
      
      // Sell signal: Price is 2% above moving average and we have a position
      if (priceVsMA > 0.02 && position) {
        await this.executeSell(tokenPair, currentPrice, position);
      }
      
    } catch (error) {
      console.error(`❌ Error analyzing ${tokenPair}:`, error.message);
    }
  }

  async executeBuy(tokenPair, price) {
    try {
      console.log(`🛒 BUY signal for ${tokenPair} at $${price.toFixed(4)}`);
      
      // In this demo, we simulate buying by tracking positions
      // In a real DeFi bot, this would interact with a DEX
      
      const amount = '100'; // Buy 100 tokens
      const cost = parseFloat(amount) * price;
      
      // Check if we have enough balance
      const balance = await this.checkBalance();
      const dgtBalance = balance.find(b => b.denom === 'DGT');
      
      if (!dgtBalance || parseFloat(dgtBalance.amount) < cost) {
        console.log('❌ Insufficient balance for purchase');
        return;
      }
      
      // Simulate the purchase (in reality, this would be a DEX swap)
      console.log(`💳 Simulating purchase of ${amount} ${tokenPair} for ${cost.toFixed(2)} DGT`);
      
      // Record the position
      this.positions.set(tokenPair, {
        amount: parseFloat(amount),
        entryPrice: price,
        timestamp: Date.now()
      });
      
      console.log(`✅ Position opened: ${amount} ${tokenPair} at $${price.toFixed(4)}`);
      
    } catch (error) {
      console.error(`❌ Failed to execute buy:`, error.message);
    }
  }

  async executeSell(tokenPair, price, position) {
    try {
      const profit = (price - position.entryPrice) * position.amount;
      const profitPercent = ((price - position.entryPrice) / position.entryPrice) * 100;
      
      console.log(`💰 SELL signal for ${tokenPair} at $${price.toFixed(4)}`);
      console.log(`📈 Profit: ${profit.toFixed(2)} DGT (${profitPercent.toFixed(2)}%)`);
      
      // Simulate the sale (in reality, this would be a DEX swap)
      console.log(`💸 Simulating sale of ${position.amount} ${tokenPair} for ${(position.amount * price).toFixed(2)} DGT`);
      
      // Close the position
      this.positions.delete(tokenPair);
      
      console.log(`✅ Position closed with ${profitPercent >= 0 ? '📈 profit' : '📉 loss'}: ${profitPercent.toFixed(2)}%`);
      
    } catch (error) {
      console.error(`❌ Failed to execute sell:`, error.message);
    }
  }

  async startTrading() {
    if (this.isTrading) {
      console.log('⚠️ Bot is already trading');
      return;
    }
    
    console.log('🚀 Starting automated trading...');
    this.isTrading = true;
    
    const tradingLoop = async () => {
      if (!this.isTrading) return;
      
      try {
        // Analyze multiple trading pairs
        for (const tokenPair of this.config.tradingPairs) {
          await this.analyzeAndTrade(tokenPair);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
        
        // Show current positions
        if (this.positions.size > 0) {
          console.log('\n📋 Current Positions:');
          for (const [pair, position] of this.positions) {
            const currentPrice = await this.getPrice(pair);
            const unrealizedPnL = (currentPrice - position.entryPrice) * position.amount;
            const unrealizedPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
            
            console.log(`   ${pair}: ${position.amount} @ $${position.entryPrice.toFixed(4)} (PnL: ${unrealizedPercent >= 0 ? '📈' : '📉'} ${unrealizedPercent.toFixed(2)}%)`);
          }
          console.log('');
        }
        
      } catch (error) {
        console.error('❌ Trading loop error:', error.message);
      }
      
      // Continue trading loop
      setTimeout(tradingLoop, this.config.tradingInterval || 10000);
    };
    
    tradingLoop();
  }

  stopTrading() {
    console.log('🛑 Stopping automated trading...');
    this.isTrading = false;
  }

  async getStats() {
    const balance = await this.checkBalance();
    
    console.log('\n📊 Trading Bot Statistics:');
    console.log('🏦 Current Balance:', balance);
    console.log('💼 Open Positions:', this.positions.size);
    console.log('📈 Tracked Pairs:', Array.from(this.priceHistory.keys()));
    
    let totalUnrealizedPnL = 0;
    for (const [pair, position] of this.positions) {
      const currentPrice = await this.getPrice(pair);
      const unrealizedPnL = (currentPrice - position.entryPrice) * position.amount;
      totalUnrealizedPnL += unrealizedPnL;
    }
    
    console.log(`💰 Total Unrealized PnL: ${totalUnrealizedPnL.toFixed(2)} DGT`);
    console.log(`🔄 Trading Status: ${this.isTrading ? '🟢 Active' : '🔴 Stopped'}`);
  }
}

// Configuration
const config = {
  rpcUrl: 'http://localhost:26657',
  apiUrl: 'http://localhost:1317',
  faucetUrl: 'http://localhost:8080/dev/faucet',
  walletPassword: 'trading-bot-password',
  tradingPairs: ['DGT/USD', 'DRT/USD'],
  basePrices: {
    'DGT/USD': 1.50,
    'DRT/USD': 0.75
  },
  tradingInterval: 15000 // 15 seconds
};

// Main execution
async function main() {
  console.log('🔥 Dytallix DeFi Trading Bot Demo');
  console.log('================================\n');
  
  const bot = new DeFiTradingBot(config);
  
  try {
    await bot.initialize();
    await bot.startTrading();
    
    // Show stats every 30 seconds
    setInterval(() => {
      bot.getStats();
    }, 30000);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down trading bot...');
      bot.stopTrading();
      await bot.getStats();
      process.exit(0);
    });
    
    console.log('🤖 Trading bot is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    console.error('❌ Failed to start trading bot:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
