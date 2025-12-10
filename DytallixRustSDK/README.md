# dytallix_sdk

Official Rust SDK for interacting with the Dytallix blockchain.

## Features

- ✅ **PQC Wallet Integration** - ML-DSA (Dilithium) and SLH-DSA (SPHINCS+) support
- ✅ **Transaction Signing** - Quantum-resistant cryptographic signatures
- ✅ **Account Queries** - Fetch balances, nonces, transaction history
- ✅ **Strongly Typed** - Native Rust structs for all blockchain primitives
- ✅ **Async/Await** - Built on `tokio` and `reqwest` for high performance

## Installation

Add the dependency via Git or local path:

```toml
[dependencies]
# Using Git (ensure you have the repo checked out or point to specific commit if supported)
dytallix_sdk = { git = "https://github.com/DytallixHQ/Dytallix.git", branch = "main" }

# Or for local development after cloning:
# dytallix_sdk = { path = "../path/to/Dytallix/DytallixRustSDK" }

tokio = { version = "1", features = ["full"] }
```

## Quick Start

### 1. Connect to Dytallix

```rust
use dytallix_sdk::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new(
        "https://rpc.testnet.dytallix.network", 
        "dyt-testnet-1"
    );

    // Check node status
    let status = client.get_status().await?;
    println!("Block height: {}", status.block_height);
    
    Ok(())
}
```

### 2. Create a PQC Wallet

```rust
use dytallix_sdk::Wallet;

// Generate ML-DSA (Dilithium) wallet
let wallet = Wallet::new()?;

println!("Address: {}", wallet.address());
// Public key is available via wallet.public_key()
```

### 3. Query Account Balance

```rust
let account = client.get_account(wallet.address()).await?;

println!("DGT Balance: {:?}", account.balances.get("DGT").unwrap_or(&0));
println!("DRT Balance: {:?}", account.balances.get("DRT").unwrap_or(&0));
println!("Nonce: {}", account.nonce);
```

### 4. Send a Transaction

```rust
use dytallix_sdk::Transaction;
// Note: Transaction construction helpers are coming in v0.2.0
// Currently requires manually constructing the Transaction struct
// and calling wallet.sign() before client.submit_transaction()
```

### 5. Query Transaction Status

```rust
// Wait for confirmation
client.wait_for_transaction("0x...").await?;
println!("Transaction confirmed!");
```

## API Reference

### Client

#### `Client::new(url: &str, chain_id: &str) -> Self`
Create a new client instance.

#### `get_status() -> Result<ChainStatus, ClientError>`
Get current blockchain status.

#### `get_account(address: &str) -> Result<AccountInfo, ClientError>`
Fetch account details including balances and nonce.

#### `submit_transaction(signed_tx: Transaction) -> Result<String, ClientError>`
Submit a signed transaction to the network. Returns the transaction hash.

#### `wait_for_transaction(hash: &str) -> ClientResult<()>`
Poll network until transaction is confirmed or timeout occurs.

### Wallet

#### `Wallet::new() -> Result<Self, PQCError>`
Generate a new PQC wallet (defaults to `ML-DSA`).

#### `Wallet::load_or_generate(path: &Path) -> Result<Self, PQCError>`
Load wallet from file or generate if it doesn't exist.

#### `sign(message: &[u8]) -> Result<PQCTransactionSignature, PQCError>`
Sign arbitrary data (like transaction hashes) with the wallet's private key.

## Examples

### Token Balance Monitor

```rust
use dytallix_sdk::Client;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() {
    let client = Client::new("https://rpc.testnet.dytallix.network", "dyt-testnet-1");
    let address = "dyt1...";

    loop {
        if let Ok(account) = client.get_account(address).await {
             println!("Balances: {:?}", account.balances);
        }
        sleep(Duration::from_secs(5)).await;
    }
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.
