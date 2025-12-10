# @dytallix/sdk

Official JavaScript/TypeScript SDK for interacting with the Dytallix blockchain.

## Features

- ✅ **PQC Wallet Integration** - ML-DSA (Dilithium) and SLH-DSA (SPHINCS+) support
- ✅ **Transaction Signing** - Quantum-resistant cryptographic signatures
- ✅ **Account Queries** - Fetch balances, nonces, transaction history
- ✅ **Token Transfers** - Send DGT/DRT with automatic fee calculation
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Browser & Node.js** - Works in both environments

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
  rpcUrl: 'https://rpc.testnet.dytallix.network',
  chainId: 'dyt-testnet-1'
});

// Check node status
const status = await client.getStatus();
console.log('Block height:', status.block_height);
```

### 2. Create a PQC Wallet

> [!IMPORTANT]
> **Node.js**: You must configure a PQC provider (e.g., using `@dytallix/pqc-wasm` or a JS implementation) before creating a wallet.
> **Browser**: If `@dytallix/pqc-wasm` is loaded as a global script, it is automatically detected.

**Node.js Setup Example:**
```typescript
import { PQCWallet, IPQCProvider } from '@dytallix/sdk';
// Import your provider implementation
// import { WasmProvider } from '@dytallix/pqc-provider-node'; // example

// Configure the provider
// PQCWallet.setProvider(new WasmProvider());

// Now you can generate keys
const wallet = await PQCWallet.generate('ML-DSA');
console.log('Address:', wallet.address);
```

**Browser Usage:**
```typescript
// Assuming <script src="dytallix-pqc.js"></script> is loaded
const wallet = await PQCWallet.generate('ML-DSA');
```

### 3. Query Account Balance

```typescript
const account = await client.getAccount(wallet.address);

console.log('DGT Balance:', account.balances.DGT);
console.log('DRT Balance:', account.balances.DRT);
console.log('Nonce:', account.nonce);
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

## API Reference

### DytallixClient

#### Constructor

```typescript
new DytallixClient(config: ClientConfig)
```

**Config Options:**
- `rpcUrl` (required): Blockchain RPC endpoint
- `chainId` (required): Chain identifier (e.g., 'dyt-testnet-1')
- `timeout`: Request timeout in ms (default: 30000)

#### Methods

[... standard client methods ...]

### PQCWallet

#### Static Methods

##### `setProvider(provider: IPQCProvider): void`
**Required for Node.js**. Sets the implementation for PQC cryptographic operations.

##### `generate(algorithm: 'ML-DSA' | 'SLH-DSA'): Promise<PQCWallet>`
Generate a new PQC wallet.

##### `fromKeystore(keystore: string, password: string): Promise<PQCWallet>`
Import wallet from encrypted keystore.

#### Instance Methods

##### `signTransaction(tx: Transaction): Promise<SignedTransaction>`
Sign a transaction with PQC signature.

##### `exportKeystore(password: string): Promise<string>`
Export encrypted keystore JSON.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines.

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.
