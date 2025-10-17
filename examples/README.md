# Dytallix SDK Examples

This directory contains working examples demonstrating the Dytallix SDK functionality.

## Available Examples

### 1. Complete Example (`complete-example.mjs`)
Comprehensive demonstration of all SDK features:
- PQC WASM module initialization
- Network connection and status
- Wallet creation and keystore management
- Balance checking with automatic faucet funding
- Token transfers
- Transaction history querying

**Run:** `node complete-example.mjs`

### 2. Quick Start (`quick-start.mjs`)
Minimal example following the README Quick Start guide:
- Basic wallet creation
- Balance checking with auto-funding
- Simple token transfer

**Run:** `node quick-start.mjs`

### 3. Balance Checker (`check-balance.mjs`)
Command-line tool for checking wallet balances with auto-funding:
- Check any address balance
- Automatic faucet funding for empty wallets
- Confirmation and updated balance display

**Run:** `node check-balance.mjs <address>`

## Features Demonstrated

✅ **Algorithm Migration**: Examples use `dilithium5` (server-compatible format)  
✅ **Auto-Funding**: Automatic faucet requests for empty wallets  
✅ **Error Handling**: Proper error handling and user feedback  
✅ **Async/Await**: Modern JavaScript patterns  
✅ **Real Network**: Uses live Dytallix testnet  

## Prerequisites

- Node.js 18+ (for ES modules and modern crypto)
- Network access to `https://dytallix.com/rpc`

## Quick Test

```bash
# Run complete example
node complete-example.mjs

# Check balance for any address
node check-balance.mjs dyt1abc123...

# Or check your own wallet
node check-balance.mjs dyt18r465xven23dqquqyuyaej22ej7rwm8p6ud99k
```

## Notes

- Examples create `example-keystore.json` for wallet persistence
- Faucet provides 100 DGT + 1000 DRT per request
- All examples include proper error handling and user feedback
- Compatible with the latest SDK algorithm format (`dilithium5`)
