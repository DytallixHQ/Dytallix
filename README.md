# @dytallix/sdk

Official JavaScript/TypeScript SDK for interacting with the Dytallix blockchain.

## 🌟 Features

- ✅ **PQC Wallet Integration** - Quantum-resistant dilithium5 (ML-DSA) signatures
- ✅ **Auto-Funding** - Automatic testnet token distribution for empty wallets
- ✅ **Transaction Signing** - Post-quantum cryptographic signatures
- ✅ **Account Queries** - Fetch balances, nonces, transaction history
- ✅ **Token Transfers** - Send DGT/DRT with automatic fee calculation
- ✅ **Faucet Integration** - Built-in testnet token requests
- ✅ **Advanced API Server** - Production-ready REST API with WebSocket support
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Browser & Node.js** - Works in both environments
- ✅ **Production Deployment** - Cloud deployment guides and scripts

## 🚀 Live Demo

Try our deployed API server:
- **API Base:** http://178.156.187.81:3000
- **Interactive Docs:** http://178.156.187.81:3000/
- **Health Check:** http://178.156.187.81:3000/api/health

## Installation

```bash
npm install @dytallix/sdk
# or
yarn add @dytallix/sdk
# or
pnpm add @dytallix/sdk
```

## Quick Start

### 1. Connect to Dytallix

```typescript
import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({
  rpcUrl: 'https://dytallix.com/rpc',
  chainId: 'dyt-local-1'
});

// Check node status
const status = await client.getStatus();
console.log('Block height:', status.block_height);
```

### 2. Create a PQC Wallet

```typescript
import { PQCWallet, initPQC } from '@dytallix/sdk';

// Initialize PQC WASM module (required once per app)
await initPQC();

// Generate dilithium5 (quantum-resistant) wallet  
const wallet = await PQCWallet.generate('dilithium5');

console.log('Address:', wallet.address);
console.log('Algorithm:', wallet.algorithm);

// Export encrypted keystore
const keystore = await wallet.exportKeystore('your-secure-password');
```

### 3. Query Account Balance (with Auto-Funding)

```typescript
const account = await client.getAccount(wallet.address);

console.log('DGT Balance:', account.balances.DGT);
console.log('DRT Balance:', account.balances.DRT);
console.log('Nonce:', account.nonce);

// Auto-fund empty wallets from faucet
const totalBalance = (account.balances.DGT || 0) + (account.balances.DRT || 0);
if (totalBalance === 0) {
  console.log('💰 Requesting funds from faucet...');
  const result = await client.requestFromFaucet(wallet.address);
  
  if (result.success) {
    console.log('✅ Faucet funding successful!');
    // Re-check balance after funding
    const updatedAccount = await client.getAccount(wallet.address);
    console.log('Updated balances:', updatedAccount.balances);
  }
}
```

### 4. Send a Transaction

```typescript
// Send 10 DRT to another address
const tx = await client.sendTokens({
  from: wallet,
  to: 'dyt1ml...',
  amount: 10,
  denom: 'DRT',
  memo: 'Payment for services'
});

console.log('Transaction hash:', tx.hash);

// Wait for confirmation
const receipt = await client.waitForTransaction(tx.hash);
console.log('Status:', receipt.status); // 'success' or 'failed'
```

### 5. Query Transaction History

```typescript
const txs = await client.getTransactions({
  address: wallet.address,
  limit: 10
});

for (const tx of txs) {
  console.log(`${tx.type}: ${tx.amount} ${tx.denom} - ${tx.status}`);
}
```

## 🚀 Advanced API Server

Build production-ready blockchain applications with our comprehensive REST API and WebSocket server.

### Features

- **REST API** with full CRUD operations
- **WebSocket** real-time updates
- **Multi-token support** (DGT/DRT)
- **Transaction history** tracking
- **Account management**
- **Rate limiting** and security
- **Analytics** and monitoring
- **Developer tools** and examples

### Quick Start

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DytallixClient, PQCWallet } from '@dytallix/sdk';

const app = express();
const server = createServer(app);
const io = new Server(server);

// Initialize SDK
const sdk = new DytallixClient({
  rpcUrl: 'https://dytallix.com/rpc',
  chainId: 'dyt-local-1'
});

// API endpoint to create wallet
app.post('/api/wallet/create', async (req, res) => {
  const wallet = await PQCWallet.generate('dilithium5');
  const keystore = await wallet.exportKeystore('default-password');
  
  res.json({
    success: true,
    wallet: {
      address: wallet.address,
      keystore: JSON.parse(keystore),
      algorithm: 'dilithium5'
    }
  });
});

// WebSocket real-time updates
io.on('connection', (socket) => {
  socket.emit('welcome', { message: 'Connected to Dytallix API' });
  
  socket.on('subscribe', (topics) => {
    socket.join(topics);
  });
});

server.listen(3000);
```

### Environment Configuration

```bash
# .env
RPC_URL=https://dytallix.com/rpc
API_URL=https://dytallix.com/api
FAUCET_URL=https://dytallix.com/faucet
CHAIN_ID=dyt-local-1
NETWORK=testnet
PORT=3000
```

## API Reference

### DytallixClient

#### Constructor

```typescript
new DytallixClient(config: ClientConfig)
```

**Config Options:**
- `rpcUrl` (required): Blockchain RPC endpoint
- `chainId` (required): Chain identifier (e.g., 'dyt-local-1')
- `timeout`: Request timeout in ms (default: 30000)

#### Methods

##### `getStatus(): Promise<ChainStatus>`
Get current blockchain status.

```typescript
const status = await client.getStatus();
// { block_height: 12345, chain_id: 'dyt-local-1', ... }
```

##### `getAccount(address: string): Promise<Account>`
Fetch account details including balances and nonce.

```typescript
const account = await client.getAccount('dyt1ml...');
// { balances: { DGT: 100, DRT: 500 }, nonce: 5, ... }
```

##### `sendTokens(tx: SendTokensRequest): Promise<TransactionResponse>`
Sign and submit a token transfer transaction.

```typescript
const tx = await client.sendTokens({
  from: wallet,
  to: 'dyt1ml...',
  amount: 10,
  denom: 'DRT',
  memo: 'Optional memo'
});
```

##### `waitForTransaction(hash: string, timeout?: number): Promise<TransactionReceipt>`
Wait for transaction confirmation.

```typescript
const receipt = await client.waitForTransaction(tx.hash);
// { status: 'success', block: 12346, ... }
```

##### `requestFromFaucet(address: string, amount?: string): Promise<FaucetResponse>`
Request tokens from the testnet faucet for development/testing.

```typescript
const result = await client.requestFromFaucet('dyt1abc...');
// { success: true, message: 'Tokens sent successfully', credited: {...} }
```

**Note**: Only available on testnet. Provides 1,000,000 DGT per request with rate limiting.

##### `getTransactions(query: TransactionQuery): Promise<Transaction[]>`
Query transaction history.

```typescript
const txs = await client.getTransactions({
  address: 'dyt1ml...',
  limit: 20,
  offset: 0
});
```

### PQCWallet

#### Static Methods

##### `generate(algorithm: 'dilithium5'): Promise<PQCWallet>`
Generate a new PQC wallet with quantum-resistant cryptography.

```typescript
const wallet = await PQCWallet.generate('dilithium5');
```

##### `fromKeystore(keystore: string, password: string): Promise<PQCWallet>`
Import wallet from encrypted keystore.

```typescript
const wallet = await PQCWallet.fromKeystore(keystoreJson, 'password');
```

#### Instance Methods

##### `signTransaction(tx: Transaction): Promise<SignedTransaction>`
Sign a transaction with PQC signature.

```typescript
const signedTx = await wallet.signTransaction(txObject);
```

##### `exportKeystore(password: string): Promise<string>`
Export encrypted keystore JSON.

```typescript
const keystore = await wallet.exportKeystore('secure-password');
```

## TypeScript Types

```typescript
interface Account {
  address: string;
  balances: {
    DGT: number;
    DRT: number;
  };
  nonce: number;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  denom: 'DGT' | 'DRT';
  fee: number;
  memo?: string;
  status: 'pending' | 'success' | 'failed';
  block?: number;
  timestamp: string;
}

interface TransactionReceipt {
  hash: string;
  status: 'success' | 'failed';
  block: number;
  gasUsed: number;
  events: Event[];
}

interface ClientConfig {
  rpcUrl: string;
  chainId: string;
  timeout?: number;
}

interface FaucetResponse {
  success: boolean;
  message: string;
  credited: {
    address: string;
    amount: string;
    denom: string;
  };
}
```

## 🛠️ Production Examples

### Advanced Payment Gateway

```typescript
import { DytallixClient, PQCWallet } from '@dytallix/sdk';
import express from 'express';

class PaymentGateway {
  private client: DytallixClient;
  private wallet: PQCWallet;

  async initialize() {
    this.client = new DytallixClient({
      rpcUrl: process.env.DYTALLIX_RPC_URL || 'https://dytallix.com/rpc',
      chainId: 'dyt-local-1'
    });

    // Load merchant wallet
    const keystoreJson = await fs.readFile('merchant-wallet.json', 'utf-8');
    this.wallet = await PQCWallet.fromKeystore(keystoreJson, process.env.WALLET_PASSWORD);
  }

  async processPayment(customerAddress: string, amount: number): Promise<string> {
    // Verify customer has sufficient balance
    const account = await this.client.getAccount(customerAddress);
    if (account.balances.DRT < amount) {
      throw new Error('Insufficient funds');
    }

    // Create payment transaction
    const tx = await this.client.sendTokens({
      from: this.wallet,
      to: customerAddress,
      amount: amount,
      denom: 'DRT',
      memo: `Payment for order #${Date.now()}`
    });

    // Wait for confirmation
    await this.client.waitForTransaction(tx.hash);
    return tx.hash;
  }
}
```

### Real-time Balance Monitor

```typescript
import { DytallixClient } from '@dytallix/sdk';
import { Server } from 'socket.io';

class BalanceMonitor {
  private client: DytallixClient;
  private io: Server;

  constructor(io: Server) {
    this.client = new DytallixClient({
      rpcUrl: 'https://dytallix.com/rpc',
      chainId: 'dyt-local-1'
    });
    this.io = io;
  }

  async startMonitoring(addresses: string[]) {
    setInterval(async () => {
      for (const address of addresses) {
        try {
          const account = await this.client.getAccount(address);
          this.io.emit('balanceUpdate', {
            address,
            balances: account.balances,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Failed to fetch balance for ${address}:`, error);
        }
      }
    }, 5000); // Check every 5 seconds
  }
}
```

### Multi-wallet Management

```typescript
import { PQCWallet } from '@dytallix/sdk';

class WalletManager {
  private wallets: Map<string, PQCWallet> = new Map();

  async createWallet(name: string, password: string): Promise<string> {
    const wallet = await PQCWallet.generate('dilithium5');
    const keystore = await wallet.exportKeystore(password);
    
    // Store wallet
    this.wallets.set(name, wallet);
    
    // Save keystore to secure storage
    await this.saveKeystore(name, keystore);
    
    return wallet.address;
  }

  async loadWallet(name: string, password: string): Promise<PQCWallet> {
    if (this.wallets.has(name)) {
      return this.wallets.get(name)!;
    }

    const keystore = await this.loadKeystore(name);
    const wallet = await PQCWallet.fromKeystore(keystore, password);
    
    this.wallets.set(name, wallet);
    return wallet;
  }

  private async saveKeystore(name: string, keystore: string): Promise<void> {
    // Implement secure keystore storage
    // This could be encrypted file storage, database, or cloud storage
  }

  private async loadKeystore(name: string): Promise<string> {
    // Implement keystore retrieval
    // Return the encrypted keystore JSON
  }
}
```

## Error Handling

```typescript
import { DytallixError, ErrorCode } from '@dytallix/sdk';

try {
  await client.sendTokens({ ... });
} catch (error) {
  if (error instanceof DytallixError) {
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_FUNDS:
        console.error('Not enough tokens');
        break;
      case ErrorCode.INVALID_SIGNATURE:
        console.error('Transaction signature invalid');
        break;
      case ErrorCode.NONCE_MISMATCH:
        console.error('Nonce out of sync, retry');
        break;
      case ErrorCode.NETWORK_ERROR:
        console.error('Network connection failed');
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

## Network Configuration

### Production
```typescript
const client = new DytallixClient({
  rpcUrl: 'https://dytallix.com/rpc',
  chainId: 'dyt-local-1'
});
```

### Local Development
```typescript
const client = new DytallixClient({
  rpcUrl: 'http://localhost:26657',
  chainId: 'dyt-local-1'
});
```

### Environment Variables
```bash
# Production
DYTALLIX_RPC_URL=https://dytallix.com/rpc
DYTALLIX_API_URL=https://dytallix.com/api
DYTALLIX_FAUCET_URL=https://dytallix.com/faucet
DYTALLIX_CHAIN_ID=dyt-local-1

# Local Development
DYTALLIX_RPC_URL=http://localhost:26657
DYTALLIX_CHAIN_ID=dyt-local-1
```

## 🔧 Developer Tools

### CLI Tools
```bash
# Check account balance
curl https://dytallix.com/api/accounts/dyt1abc.../balance

# Create new wallet
curl -X POST http://localhost:3000/api/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "dilithium5", "name": "My Wallet"}'

# Send transaction
curl -X POST http://localhost:3000/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "keystore": {...},
    "password": "your-password",
    "to": "dyt1recipient...",
    "amount": "100",
    "denom": "DGT"
  }'
```

### WebSocket Integration
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('transaction', (tx) => {
  console.log('New transaction:', tx);
});

socket.on('newAccount', (account) => {
  console.log('New account created:', account);
});

socket.on('balanceUpdate', (update) => {
  console.log('Balance updated:', update);
});
```

### Analytics and Monitoring
```typescript
// Get system analytics
const analytics = await fetch('/api/analytics').then(r => r.json());
console.log('Total transactions:', analytics.analytics.totalTransactions);
console.log('Total accounts:', analytics.analytics.totalAccounts);
console.log('Volume:', analytics.analytics.totalVolume);

// Monitor server health
const health = await fetch('/api/health').then(r => r.json());
console.log('Server status:', health.status);
console.log('Uptime:', health.uptime);
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## Support

- **GitHub Issues:** [https://github.com/DytallixHQ/Dytallix/issues](https://github.com/DytallixHQ/Dytallix/issues)
- **Twitter/X:** [@DytallixHQ](https://twitter.com/DytallixHQ)
- **Documentation:** [https://docs.dytallix.com](https://docs.dytallix.com)
- **Live Demo:** [http://178.156.187.81:3000](http://178.156.187.81:3000)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
