#!/usr/bin/env node
/**
 * Example: Load an existing PQC wallet from JSON
 * 
 * This example shows how to:
 * 1. Read a wallet from a saved JSON file
 * 2. Restore the wallet using fromJSON()
 * 3. Display wallet information
 */

import { PQCWallet } from '@dytallix/sdk';
import { readFile } from 'fs/promises';

async function main() {
  const filename = process.argv[2] || 'wallet.json';
  
  try {
    // Read wallet from file
    console.log(`Loading wallet from ${filename}...`);
    const walletData = await readFile(filename, 'utf-8');
    const walletJson = JSON.parse(walletData);

    // Restore wallet
    const wallet = PQCWallet.fromJSON(walletJson);

    console.log('\n✅ Wallet loaded successfully!');
    console.log('Address:', wallet.address);
    console.log('Algorithm:', wallet.algorithm);
    console.log('Truncated:', wallet.getTruncatedAddress());
    
    // Get key information
    const publicKey = wallet.getPublicKey();
    console.log('\nPublic key size:', publicKey.length, 'bytes');
    
    console.log('\n✨ Wallet is ready to use for signing transactions!');
    
    return wallet;
  } catch (error) {
    console.error('Error loading wallet:', error.message);
    console.log('\nUsage: node load-wallet.js [wallet.json]');
    process.exit(1);
  }
}

main().catch(console.error);
