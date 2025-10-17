#!/usr/bin/env node
/**
 * Example: Create a new PQC wallet
 * 
 * This example shows how to:
 * 1. Generate a new quantum-resistant wallet
 * 2. Display the wallet address
 * 3. Export and save the wallet to a JSON file
 * 
 * WARNING: The exported JSON contains the private key in plaintext!
 * For production use, encrypt the file or store it securely.
 */

import { initPQC, PQCWallet } from '@dytallix/sdk';
import { writeFile } from 'fs/promises';

async function main() {
  // Initialize PQC module (required before wallet operations)
  console.log('Initializing PQC module...');
  await initPQC();

  // Generate a new ML-DSA wallet
  console.log('Generating new wallet...');
  const wallet = await PQCWallet.generate('ML-DSA');

  console.log('\n✅ Wallet created successfully!');
  console.log('Address:', wallet.address);
  console.log('Algorithm:', wallet.algorithm);
  console.log('Truncated:', wallet.getTruncatedAddress());

  // Export wallet as JSON
  const walletJson = JSON.stringify(wallet.toJSON(), null, 2);
  
  // Save to file
  const filename = 'my-wallet.json';
  await writeFile(filename, walletJson);
  
  console.log(`\n⚠️  Wallet saved to ${filename}`);
  console.log('WARNING: This file contains your UNENCRYPTED private key!');
  console.log('Keep it secure and never share it with anyone.');
  
  return wallet;
}

main().catch(console.error);
