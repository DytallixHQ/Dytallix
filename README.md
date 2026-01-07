# Dytallix

Post-quantum secure blockchain with AI-enhanced transaction processing. Dytallix uses ML-DSA (FIPS 204, formerly Dilithium) for quantum-resistant cryptographic signatures, protecting assets against future quantum computing threats.

## SDKs

### TypeScript SDK

```bash
cd sdk/typescript
npm install
npm run build
node examples/wallet_and_tx.js
```

See [sdk/typescript/README.md](sdk/typescript/README.md) for full documentation.

### Rust SDK

```bash
cd sdk/rust
cargo build
cargo test
cargo run --example wallet
```

See [sdk/rust/README.md](sdk/rust/README.md) for full documentation.

## Network

| Network | RPC Endpoint | Chain ID |
|---------|--------------|----------|
| Testnet | `https://dytallix.com/rpc` | `dytallix-testnet-1` |

## Tokens

| Token | Symbol | Purpose |
|-------|--------|---------|
| DGT | Dytallix Governance Token | Staking & governance |
| DRT | Dytallix Reward Token | Transaction fees & rewards |

## License

Apache-2.0
