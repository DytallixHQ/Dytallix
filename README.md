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

### For End Users - Web GUI
Experience Dytallix with our intuitive web interface:
- **Main Website:** https://www.dytallix.com
- **PQC Wallet:** Create quantum-resistant wallets
- **Send/Receive:** Transfer DGT and DRT tokens
- **Faucet:** Get testnet tokens instantly
- **Explorer:** View transactions and balances

### For Developers - API Server
Integrate Dytallix into your applications:
- **API Base:** http://178.156.187.81:3000
- **Interactive Docs:** http://178.156.187.81:3000/
- **Health Check:** http://178.156.187.81:3000/api/health

## 🛡️ Security Features

### Enhanced Key Management (NEW)

Dytallix SDK now includes secure key management to address **CWE-316: Cleartext Storage of Sensitive Information in Memory**:

```typescript
import { EphemeralPQCKeyManager } from '@dytallix/sdk';

// Create secure key manager with automatic cleanup
const keyManager = new EphemeralPQCKeyManager({
  enableBeforeUnloadCleanup: true,  // Auto-cleanup on navigation
  secureDeletePasses: 3,            // Multiple overwrite passes
  enableLogging: false              // Disable in production
});

// Generate ephemeral keys that are automatically cleaned up
const keyPair = await keyManager.generateKeys('ML-DSA');

// Keys are automatically cleared on:
// - Browser navigation (beforeunload event)
// - Tab switching (optional)
// - Manual cleanup
keyManager.clearKeys();

// Always destroy when done
keyManager.destroy();
```

**Security Benefits:**
- ✅ **Automatic Memory Cleanup**: Keys are wiped on browser navigation
- ✅ **Secure Deletion**: Multiple-pass overwriting with random data
- ✅ **Browser Event Handling**: beforeunload, visibilitychange events
- ✅ **Memory Protection**: ArrayBuffer storage instead of strings
- ✅ **State Validation**: Operations fail on destroyed instances

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
  rpcUrl: 'https://dytallix.com/api/',
  chainId: 'dytallix-testnet-1'
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
const wallet = await PQCWallet.generate('ML-DSA');

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
  to: 'pqc1ml...',
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
  rpcUrl: 'https://dytallix.com/api/',
  chainId: 'dytallix-testnet-1'
});

// API endpoint to create wallet
app.post('/api/wallet/create', async (req, res) => {
  const wallet = await PQCWallet.generate('ML-DSA');
  const keystore = await wallet.exportKeystore('default-password');
  
  res.json({
    success: true,
    wallet: {
      address: wallet.address,
      keystore: JSON.parse(keystore),
      algorithm: 'ML-DSA'
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
- `chainId` (required): Chain identifier (e.g., 'dytallix-testnet-1')
- `timeout`: Request timeout in ms (default: 30000)

#### Methods

##### `getStatus(): Promise<ChainStatus>`
Get current blockchain status.

```typescript
const status = await client.getStatus();
// { block_height: 12345, chain_id: 'dytallix-testnet-1', ... }
```

##### `getAccount(address: string): Promise<Account>`
Fetch account details including balances and nonce.

```typescript
const account = await client.getAccount('pqc1ml...');
// { balances: { DGT: 100, DRT: 500 }, nonce: 5, ... }
```

##### `sendTokens(tx: SendTokensRequest): Promise<TransactionResponse>`
Sign and submit a token transfer transaction.

```typescript
const tx = await client.sendTokens({
  from: wallet,
  to: 'pqc1ml...',
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
const result = await client.requestFromFaucet('pqc1abc...');
// { success: true, message: 'Tokens sent successfully', credited: {...} }
```

**Note**: Only available on testnet. Provides 1,000,000 DGT per request with rate limiting.

##### `getTransactions(query: TransactionQuery): Promise<Transaction[]>`
Query transaction history.

```typescript
const txs = await client.getTransactions({
  address: 'pqc1ml...',
  limit: 20,
  offset: 0
});
```

### EphemeralPQCKeyManager (NEW - Secure)

For maximum security, use `EphemeralPQCKeyManager` instead of `PQCWallet` in browser environments:

#### Constructor

```typescript
new EphemeralPQCKeyManager(options?: EphemeralKeyManagerOptions)
```

**Options:**
- `enableBeforeUnloadCleanup` (default: true): Auto-cleanup on navigation
- `secureDeletePasses` (default: 3): Number of memory overwrite passes
- `enableLogging` (default: false): Enable security logging

#### Methods

##### `generateKeys(algorithm?: 'ML-DSA' | 'SLH-DSA'): Promise<EphemeralKeyPair>`
Generate new ephemeral keys with automatic cleanup.

##### `clearKeys(): void`
Manually clear keys from memory using secure deletion.

##### `signTransaction(txObj: any): Promise<any>`
Sign transaction with ephemeral keys.

##### `destroy(): void`
Destroy manager and cleanup all resources.

### PQCWallet

#### Static Methods

##### `generate(algorithm: 'ML-DSA' | 'SLH-DSA'): Promise<PQCWallet>`
Generate a new PQC wallet with quantum-resistant cryptography.

```typescript
const wallet = await PQCWallet.generate('ML-DSA');
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
      rpcUrl: process.env.DYTALLIX_RPC_URL || 'https://dytallix.com/api/',
      chainId: 'dytallix-testnet-1'
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
      rpcUrl: 'https://dytallix.com/api/',
      chainId: 'dytallix-testnet-1'
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
    const wallet = await PQCWallet.generate('ML-DSA');
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
  rpcUrl: 'https://dytallix.com/api/',
  chainId: 'dytallix-testnet-1'
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
DYTALLIX_RPC_URL=https://dytallix.com/api/
DYTALLIX_API_URL=https://dytallix.com/api
DYTALLIX_FAUCET_URL=https://dytallix.com/faucet
DYTALLIX_CHAIN_ID=dytallix-testnet-1

# Local Development
DYTALLIX_RPC_URL=http://localhost:26657
DYTALLIX_CHAIN_ID=dyt-local-1
```

## 🔧 Developer Tools

### CLI Tools

The Dytallix SDK comes with built-in CLI scripts for common blockchain operations. These Node.js scripts provide an easy way to interact with the blockchain from the command line.

#### Prerequisites
```bash
npm install @dytallix/sdk
# Ensure Node.js 16+ is installed
```

#### Available Commands

##### 1. **Check Network Status**
```bash
node status.mjs
```
Shows current blockchain status including block height and chain information.

##### 2. **Create a New PQC Wallet**
```bash
node wallet.mjs
```
Generates a new quantum-resistant wallet and saves it as `keystore.json`.

**Output:**
```
Address: pqc1abc123...
Saved keystore.json
```

##### 3. **Check Account Balance (with Auto-Funding)**
```bash
node balance.mjs <wallet-address>
```
Checks balance for any wallet address. Automatically requests faucet funds for empty wallets.

**Example:**
```bash
node balance.mjs pqc1abc123...
```

**Sample Output:**
```
Account: pqc1abc123...
Balances: { DGT: 0, DRT: 0 }
Nonce: 0

💰 Wallet has no funds. Requesting from faucet...
   Requesting: 100 DGT + 1000 DRT
✅ Faucet funding successful!
🔄 Updated Balances: { DGT: 100, DRT: 1000 }
```

##### 4. **Send Tokens**
```bash
node send.mjs
```
Sends tokens using your saved `keystore.json`. By default sends to itself.

**Specify recipient:**
```bash
DYT_TO=pqc1recipient... node send.mjs
```

**Output:**
```
TX hash: 0xabc123...
Status: success block: 12346
```

#### Environment Variables

Customize CLI behavior with these variables:

```bash
# Use different RPC endpoint
export DYTALLIX_RPC_URL=http://localhost:26657

# Use different chain ID  
export DYTALLIX_CHAIN_ID=dytallix-testnet-1

# Specify recipient for send command
export DYT_TO=pqc1abc123...
```

#### Complete Workflow Example

```bash
# 1. Check network status
node status.mjs

# 2. Create new wallet
node wallet.mjs

# 3. Check balance (auto-funds if empty)
node balance.mjs pqc1your-address-here

# 4. Send tokens to another address
DYT_TO=pqc1recipient-address node send.mjs
```

#### Batch Operations Script

Create `workflow.sh` for automated operations:

```bash
#!/bin/bash
echo "Creating new wallet..."
node wallet.mjs

echo "Getting wallet address..."
ADDRESS=$(node -e "
const fs = require('fs');
const ks = JSON.parse(fs.readFileSync('keystore.json', 'utf8'));
console.log(ks.address);
")

echo "Checking balance and auto-funding..."
node balance.mjs $ADDRESS

echo "Wallet ready for transactions!"
```

### REST API Tools

For programmatic access, use these curl commands:

```bash
# Check account balance via API
curl https://dytallix.com/api/accounts/pqc1abc.../balance

# Create new wallet via API
curl -X POST http://localhost:3000/api/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "ML-DSA", "name": "My Wallet"}'

# Send transaction via API
curl -X POST http://localhost:3000/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "keystore": {...},
    "password": "your-password",
    "to": "pqc1recipient...",
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

- **Web Interface:** [https://www.dytallix.com](https://www.dytallix.com) - Create wallets and send transactions
- **GitHub Issues:** [https://github.com/DytallixHQ/Dytallix/issues](https://github.com/DytallixHQ/Dytallix/issues)
- **Twitter/X:** [@DytallixHQ](https://twitter.com/DytallixHQ)
- **Documentation:** [https://www.dytallix.com/#/docs](https://www.dytallix.com/#/docs)
- **Developer API:** [http://178.156.187.81:3000](http://178.156.187.81:3000)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
