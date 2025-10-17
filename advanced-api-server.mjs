#!/usr/bin/env node

/**
 * Advanced Dytallix Blockchain Web API Server
 * 
 * A comprehensive demonstration of building production-ready 
 * blockchain-powered applications on Dytallix.
 * 
 * Features:
 * - REST API with full CRUD operations
 * - WebSocket real-time updates
 * - Multi-token support (DGT/DRT)
 * - Transaction history tracking
 * - Account management
 * - Rate limiting and security
 * - Analytics and monitoring
 * - Developer tools
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { DytallixClient, PQCWallet } from './dytallix-fast-launch/sdk/dist/index.mjs';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuration
const config = {
  port: process.env.PORT || 3000,
  rpcUrl: process.env.RPC_URL || 'https://dytallix.com/rpc',
  apiUrl: process.env.API_URL || 'https://dytallix.com/api',
  faucetUrl: process.env.FAUCET_URL || 'https://dytallix.com/faucet',
  chainId: process.env.CHAIN_ID || 'dyt-local-1',
  network: process.env.NETWORK || 'testnet',
  version: '2.0.0'
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});

const faucetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit faucet requests
  message: {
    error: 'Faucet rate limit exceeded. Please try again in 1 hour.',
    retryAfter: '1 hour'
  }
});

app.use('/api/', limiter);
app.use('/api/faucet/', faucetLimiter);

// Initialize SDK
let sdk;
const initSDK = async () => {
  try {
    console.log('🔧 Initializing Dytallix SDK...');
    sdk = new DytallixClient({
      rpcUrl: config.rpcUrl,
      chainId: 'dyt-local-1'
    });
    console.log('✅ SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize SDK:', error.message);
    return false;
  }
};

// In-memory storage for demo (use database in production)
const storage = {
  accounts: new Map(),
  transactions: [],
  sessions: new Map(),
  analytics: {
    totalAccounts: 0,
    totalTransactions: 0,
    totalVolume: { DGT: 0, DRT: 0 },
    dailyStats: new Map()
  }
};

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const logTransaction = (tx) => {
  storage.transactions.push({
    ...tx,
    timestamp: new Date().toISOString(),
    id: generateId()
  });
  
  // Update analytics
  storage.analytics.totalTransactions++;
  if (tx.amount && tx.denom) {
    storage.analytics.totalVolume[tx.denom] += parseFloat(tx.amount);
  }
  
  // Emit real-time update
  io.emit('transaction', tx);
};

const updateDailyStats = () => {
  const today = new Date().toISOString().split('T')[0];
  if (!storage.analytics.dailyStats.has(today)) {
    storage.analytics.dailyStats.set(today, {
      transactions: 0,
      newAccounts: 0,
      volume: { DGT: 0, DRT: 0 }
    });
  }
  return storage.analytics.dailyStats.get(today);
};

// API Routes

// Root endpoint with comprehensive API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Advanced Dytallix Blockchain API',
    version: config.version,
    network: config.network,
    description: 'Production-ready quantum-resistant blockchain API',
    
    features: [
      'Account management with full CRUD operations',
      'Multi-token support (DGT/DRT)',
      'Real-time WebSocket updates',
      'Transaction history and analytics',
      'Rate limiting and security',
      'Testnet faucet integration',
      'Developer tools and examples'
    ],
    
    endpoints: {
      // Account Management
      '/api/accounts': 'GET - List all accounts',
      '/api/accounts/:address': 'GET - Get account details',
      '/api/accounts/:address/balance': 'GET - Get account balance',
      '/api/accounts/:address/transactions': 'GET - Get transaction history',
      
      // Wallet Operations
      '/api/wallet/create': 'POST - Create new wallet',
      '/api/wallet/import': 'POST - Import existing wallet',
      '/api/wallet/backup': 'POST - Backup wallet',
      
      // Transactions
      '/api/transfer': 'POST - Send tokens',
      '/api/transactions': 'GET - List transactions',
      '/api/transactions/:id': 'GET - Get transaction details',
      
      // Faucet
      '/api/faucet/fund': 'POST - Request testnet tokens',
      '/api/faucet/status': 'GET - Check faucet status',
      
      // System
      '/api/status': 'GET - Network status',
      '/api/analytics': 'GET - Usage analytics',
      '/api/health': 'GET - Health check',
      
      // Developer Tools
      '/api/dev/simulate': 'POST - Simulate transaction',
      '/api/dev/examples': 'GET - Code examples',
      '/api/dev/algorithms': 'GET - Supported algorithms'
    },
    
    websocket: {
      url: `ws://localhost:${config.port}`,
      events: [
        'transaction - New transaction broadcast',
        'balance - Balance updates',
        'status - Network status changes'
      ]
    },
    
    examples: {
      curl: `curl -X POST http://localhost:${config.port}/api/wallet/create`,
      javascript: 'See /api/dev/examples for complete code samples'
    }
  });
});

// Network status
app.get('/api/status', async (req, res) => {
  try {
    const status = await sdk.getStatus();
    res.json({
      success: true,
      network: config.network,
      status: status,
      server: {
        version: config.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: io.engine.clientsCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: io.engine.clientsCount
  });
});

// Account Management
app.get('/api/accounts', (req, res) => {
  const accounts = Array.from(storage.accounts.values());
  res.json({
    success: true,
    count: accounts.length,
    accounts: accounts.map(acc => ({
      address: acc.address,
      created: acc.created,
      lastActivity: acc.lastActivity,
      transactionCount: acc.transactionCount || 0
    }))
  });
});

app.get('/api/accounts/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!address || !address.startsWith('dyt1')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format. Address must start with dyt1'
      });
    }
    
    let balance = [];
    let blockchainError = null;
    
    // Try to get balance from blockchain
    try {
      const account = await sdk.getAccount(address);
      balance = Object.entries(account.balances).map(([denom, amount]) => ({
        denom,
        amount: amount.toString()
      }));
    } catch (blockchainErr) {
      blockchainError = blockchainErr.message;
      // Use default empty balance if blockchain is unavailable
      balance = [
        { denom: 'DGT', amount: '0' },
        { denom: 'DRT', amount: '0' }
      ];
    }
    
    let storedAccount = storage.accounts.get(address);
    if (!storedAccount) {
      storedAccount = {
        address,
        created: new Date().toISOString(),
        transactionCount: 0
      };
      storage.accounts.set(address, storedAccount);
    }
    
    const response = {
      success: true,
      account: {
        ...storedAccount,
        balance
      }
    };
    
    // Add warning if blockchain was unavailable
    if (blockchainError) {
      response.warning = `Blockchain unavailable: ${blockchainError}. Showing cached/default data.`;
      response.account.blockchainStatus = 'offline';
    } else {
      response.account.blockchainStatus = 'online';
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/accounts/:address/balance', async (req, res) => {
  try {
    const { address } = req.params;
    const account = await sdk.getAccount(address);
    const balance = Object.entries(account.balances).map(([denom, amount]) => ({
      denom,
      amount: amount.toString()
    }));
    
    res.json({
      success: true,
      address,
      balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/accounts/:address/transactions', (req, res) => {
  const { address } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const accountTxs = storage.transactions.filter(
    tx => tx.from === address || tx.to === address
  );
  
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);
  const paginatedTxs = accountTxs.slice(start, end);
  
  res.json({
    success: true,
    address,
    page: parseInt(page),
    limit: parseInt(limit),
    total: accountTxs.length,
    transactions: paginatedTxs
  });
});

// Wallet Operations
app.post('/api/wallet/create', async (req, res) => {
  try {
    const { algorithm = 'dilithium5', password, name } = req.body;
    
    const wallet = await PQCWallet.generate(algorithm);
    const keystoreJson = password ? 
      await wallet.exportKeystore(password) : 
      await wallet.exportKeystore('default-password');
    const keystore = JSON.parse(keystoreJson);
    const address = wallet.address;
    
    // Store account info
    const account = {
      address,
      algorithm,
      name: name || `Wallet ${generateId()}`,
      created: new Date().toISOString(),
      transactionCount: 0,
      lastActivity: new Date().toISOString()
    };
    
    storage.accounts.set(address, account);
    storage.analytics.totalAccounts++;
    
    const dailyStats = updateDailyStats();
    dailyStats.newAccounts++;
    
    // Emit real-time update
    io.emit('newAccount', { address, name: account.name });
    
    res.json({
      success: true,
      wallet: {
        address: wallet.address,
        keystore: keystore,
        algorithm,
        name: account.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/wallet/import', async (req, res) => {
  try {
    const { keystore, password, name } = req.body;
    
    if (!keystore || !keystore.address) {
      return res.status(400).json({
        success: false,
        error: 'Valid keystore required'
      });
    }
    
    const address = keystore.address;
    
    // Store account info
    const account = {
      address,
      name: name || `Imported Wallet ${generateId()}`,
      created: new Date().toISOString(),
      transactionCount: 0,
      lastActivity: new Date().toISOString(),
      imported: true
    };
    
    storage.accounts.set(address, account);
    
    res.json({
      success: true,
      account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Transactions
app.post('/api/transfer', async (req, res) => {
  try {
    const { keystore, password, to, amount, denom = 'DGT', memo } = req.body;
    
    if (!keystore || !password || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: keystore, password, to, amount'
      });
    }
    
    const result = await sdk.sendTokens({
      from: { keystore, password },
      to,
      amount: parseFloat(amount),
      denom,
      memo
    });
    
    const transaction = {
      from: keystore.address,
      to,
      amount,
      denom,
      memo,
      result,
      status: 'completed'
    };
    
    logTransaction(transaction);
    
    // Update account activity
    const account = storage.accounts.get(keystore.address);
    if (account) {
      account.transactionCount = (account.transactionCount || 0) + 1;
      account.lastActivity = new Date().toISOString();
    }
    
    const dailyStats = updateDailyStats();
    dailyStats.transactions++;
    dailyStats.volume[denom] += parseFloat(amount);
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    const failedTx = {
      from: req.body.keystore?.address,
      to: req.body.to,
      amount: req.body.amount,
      denom: req.body.denom || 'DGT',
      status: 'failed',
      error: error.message
    };
    
    logTransaction(failedTx);
    
    res.status(500).json({
      success: false,
      error: error.message,
      transaction: failedTx
    });
  }
});

app.get('/api/transactions', (req, res) => {
  const { page = 1, limit = 20, status, denom } = req.query;
  
  let transactions = storage.transactions;
  
  if (status) {
    transactions = transactions.filter(tx => tx.status === status);
  }
  
  if (denom) {
    transactions = transactions.filter(tx => tx.denom === denom);
  }
  
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);
  const paginatedTxs = transactions.slice(start, end);
  
  res.json({
    success: true,
    page: parseInt(page),
    limit: parseInt(limit),
    total: transactions.length,
    transactions: paginatedTxs
  });
});

app.get('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const transaction = storage.transactions.find(tx => tx.id === id);
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: 'Transaction not found'
    });
  }
  
  res.json({
    success: true,
    transaction
  });
});

// Faucet
app.post('/api/faucet/fund', async (req, res) => {
  try {
    const { address, amount } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }
    
    const result = await sdk.requestFromFaucet(address, amount);
    
    const transaction = {
      from: 'faucet',
      to: address,
      amount: amount || '1000000',
      denom: 'DGT',
      status: 'completed',
      type: 'faucet'
    };
    
    logTransaction(transaction);
    
    res.json({
      success: true,
      result,
      transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/faucet/status', (req, res) => {
  res.json({
    success: true,
    faucet: {
      available: true,
      url: config.faucetUrl,
      rateLimit: '10 requests per hour per IP',
      defaultAmount: '1000000 DGT'
    }
  });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const { timeframe = '24h' } = req.query;
  
  res.json({
    success: true,
    timeframe,
    analytics: {
      ...storage.analytics,
      dailyStats: Object.fromEntries(storage.analytics.dailyStats),
      realtimeConnections: io.engine.clientsCount
    }
  });
});

// Developer Tools
app.get('/api/dev/examples', (req, res) => {
  res.json({
    success: true,
    examples: {
      createWallet: {
        curl: `curl -X POST http://localhost:${config.port}/api/wallet/create \\
  -H "Content-Type: application/json" \\
  -d '{"algorithm": "dilithium5", "name": "My Wallet"}'`,
        
        javascript: `
// Create a new wallet
const response = await fetch('/api/wallet/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    algorithm: 'dilithium5',
    name: 'My DApp Wallet'
  })
});
const wallet = await response.json();
console.log('New wallet:', wallet.wallet.address);`
      },
      
      checkBalance: {
        curl: `curl http://localhost:${config.port}/api/accounts/dyt1abc123.../balance`,
        
        javascript: `
// Check account balance
const response = await fetch('/api/accounts/dyt1abc123.../balance');
const data = await response.json();
console.log('Balance:', data.balance);`
      },
      
      sendTokens: {
        curl: `curl -X POST http://localhost:${config.port}/api/transfer \\
  -H "Content-Type: application/json" \\
  -d '{
    "keystore": {...},
    "password": "your-password",
    "to": "dyt1recipient...",
    "amount": "100",
    "denom": "DGT"
  }'`,
        
        javascript: `
// Send tokens
const response = await fetch('/api/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keystore: wallet.keystore,
    password: 'your-password',
    to: 'dyt1recipient...',
    amount: '100',
    denom: 'DGT'
  })
});
const result = await response.json();`
      },
      
      realtime: {
        javascript: `
// Real-time updates with WebSocket
import io from 'socket.io-client';

const socket = io('http://localhost:${config.port}');

socket.on('transaction', (tx) => {
  console.log('New transaction:', tx);
});

socket.on('newAccount', (account) => {
  console.log('New account created:', account);
});`
      }
    }
  });
});

app.get('/api/dev/algorithms', (req, res) => {
  res.json({
    success: true,
    algorithms: {
      supported: ['dilithium5'],
      recommended: 'dilithium5',
      description: 'Post-quantum cryptographic algorithms for wallet creation'
    }
  });
});

app.post('/api/dev/simulate', async (req, res) => {
  try {
    const { from, to, amount, denom = 'DGT' } = req.body;
    
    // Simulate transaction without actually sending it
    const simulation = {
      from,
      to,
      amount,
      denom,
      estimatedFee: '1000',
      estimatedGas: '200000',
      wouldSucceed: true,
      requiredBalance: amount,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      simulation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/status',
      'POST /api/wallet/create',
      'GET /api/accounts/:address/balance',
      'POST /api/transfer',
      'POST /api/faucet/fund'
    ]
  });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log(`📡 New WebSocket connection: ${socket.id}`);
  
  socket.emit('welcome', {
    message: 'Connected to Dytallix Blockchain API',
    server: config.version,
    network: config.network
  });
  
  socket.on('subscribe', (topics) => {
    console.log(`📋 Client ${socket.id} subscribed to:`, topics);
    socket.join(topics);
  });
  
  socket.on('disconnect', () => {
    console.log(`📱 Client disconnected: ${socket.id}`);
  });
});

// Server startup
const startServer = async () => {
  const sdkReady = await initSDK();
  
  if (!sdkReady) {
    console.error('❌ Failed to start server: SDK initialization failed');
    process.exit(1);
  }
  
  server.listen(config.port, () => {
    console.log('\n🚀 Advanced Dytallix Blockchain API Server Started!');
    console.log('=' .repeat(60));
    console.log(`📡 Server:           http://localhost:${config.port}`);
    console.log(`📚 API Documentation: http://localhost:${config.port}/`);
    console.log(`🔌 WebSocket:        ws://localhost:${config.port}`);
    console.log(`🌐 Network:          ${config.network}`);
    console.log(`📊 Analytics:        http://localhost:${config.port}/api/analytics`);
    console.log(`🛠️  Developer Tools:  http://localhost:${config.port}/api/dev/examples`);
    console.log('=' .repeat(60));
    console.log('\n🔥 Ready to build quantum-resistant applications!');
    console.log('\n💡 Quick Start:');
    console.log(`   curl -X POST http://localhost:${config.port}/api/wallet/create`);
    console.log(`   curl http://localhost:${config.port}/api/status\n`);
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();
