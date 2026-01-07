# Dytallix

**Post-Quantum Secure Blockchain Platform**

Dytallix is a next-generation blockchain platform designed with quantum-resistant cryptography from the ground up, protecting your assets against both current and future threats.

## 🚀 Quick Start

### Install the SDK

```bash
npm install @dytallix/sdk
```

### Connect to Testnet

```typescript
import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({
  network: 'testnet',
  rpcUrl: 'https://testnet.dytallix.com/rpc'
});

// Check connection
const status = await client.getNetworkStatus();
console.log('Connected to Dytallix:', status);
```

## 📦 What's Included

- **[sdk/typescript/](./sdk/typescript)** - TypeScript/JavaScript SDK for interacting with Dytallix
- **[sdk/rust/](./sdk/rust)** - Rust SDK for high-performance applications
- **[cli/](./cli)** - Command-line tools for node operations and development
- **[contracts/](./contracts)** - Example smart contracts (hello-world, counter)
- **[examples/](./examples)** - Code examples for common use cases
- **[docs/](./docs)** - Technical documentation

## 🔧 Running a Node

```bash
# Install the CLI
cd cli
cargo build --release

# Start a testnet node
./target/release/dytallix-cli node start --network testnet
```

## 📝 Deploy a Smart Contract

```typescript
import { DytallixClient, Contract } from '@dytallix/sdk';

const client = new DytallixClient({ network: 'testnet' });

// Deploy a contract
const contract = await client.deployContract({
  code: contractWasm,
  args: { initial_value: 0 }
});

console.log('Contract deployed at:', contract.address);
```

## 🔐 Post-Quantum Security

Dytallix uses CRYSTALS-Dilithium signatures and CRYSTALS-Kyber key exchange, both selected by NIST for post-quantum cryptography standardization. Your transactions are secure against both classical and quantum attacks.

## 📚 Documentation

- [SDK Documentation](./sdk/README.md)
- [CLI Reference](./cli/README_CLI.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Smart Contracts Guide](./docs/CONTRACTS.md)

## 🌐 Testnet Resources

- **RPC Endpoint**: `https://testnet.dytallix.com/rpc`
- **Explorer**: [https://explorer.dytallix.com](https://explorer.dytallix.com)
- **Faucet**: [https://faucet.dytallix.com](https://faucet.dytallix.com)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./sdk/CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [Website](https://dytallix.com)
- [Documentation](https://dytallix.com/resources)
- [Discord](https://discord.gg/N8Q4A2KE)
- [X](https://x.com/dytallixhq)
