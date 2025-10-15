# Changelog

All notable changes to the Dytallix SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2025-10-15

### Changed
- 🔄 Updated RPC endpoint configuration
  - Changed default RPC URL from `https://rpc.testnet.dytallix.network` to `https://dytallix.com/api/`
  - Updated chain ID from `dyt-testnet-1` to `dytallix-testnet-1` for consistency
  - Updated all documentation and examples to reflect production endpoints

### Fixed
- 📝 Updated documentation to match actual deployment configuration
- 🌐 Corrected explorer URLs to use `dytallix.com` domain

## [0.1.2] - 2025-10-14

### Added
- ✨ Integrated `@dytallix/pqc-wasm` for real quantum-resistant cryptography
- 🔐 Real ML-DSA (Dilithium) WASM implementation
- 📦 Added `initPQC()` export for manual WASM initialization
- 📚 Enhanced documentation for pqc-wasm integration

## [0.1.0] - 2025-10-11

### Added
- 🎉 Initial release of Dytallix SDK
- ✅ Post-quantum cryptography (PQC) wallet support
  - ML-DSA (Dilithium) algorithm
  - SLH-DSA (SPHINCS+) algorithm
- ✅ DytallixClient for blockchain interaction
  - Connect to Dytallix RPC nodes
  - Query node status and block information
  - Account queries (balance, nonce, transaction history)
- ✅ Transaction creation and signing
  - Quantum-resistant cryptographic signatures
  - Automatic fee calculation
  - Token transfers (DGT and DRT)
- ✅ Full TypeScript support
  - Complete type definitions included
  - IntelliSense support in IDEs
- ✅ Cross-platform compatibility
  - Works in browsers (ESM)
  - Works in Node.js (CommonJS)
- ✅ Comprehensive documentation
  - Usage examples
  - API reference
  - Getting started guide

### Package Details
- Package name: `@dytallix/sdk`
- License: Apache-2.0
- Repository: https://github.com/HisMadRealm/dytallix
- NPM: https://www.npmjs.com/package/@dytallix/sdk

---

## [Unreleased]

### Planned Features
- Smart contract interaction support
- Batch transaction support
- Event subscription and WebSocket support
- Hardware wallet integration
- React hooks for easier integration
- Additional network support (mainnet, testnet variants)

---

[0.1.0]: https://github.com/DytallixHQ/dytallix-sdk/releases/tag/v0.1.0
