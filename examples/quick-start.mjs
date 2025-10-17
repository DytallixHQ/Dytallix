/**
 * Dytallix SDK Quick Start Example
 * 
 * Demonstrates the basic usage shown in README documentation
 */

import { initPQC, PQCWallet, DytallixClient } from '@dytallix/sdk';

async function quickStart() {
  // 1. Connect to Dytallix
  const client = new DytallixClient({
    rpcUrl: 'https://dytallix.com/rpc',
    chainId: 'dyt-local-1'
  });

  // Check node status
  const status = await client.getStatus();
  console.log('Block height:', status.block_height);

  // 2. Create a PQC Wallet
  await initPQC(); // Initialize PQC WASM module

  // Generate dilithium5 (ML-DSA) wallet  
  const wallet = await PQCWallet.generate('dilithium5');

  console.log('Address:', wallet.address);
  console.log('Algorithm:', wallet.algorithm);

  // Export encrypted keystore
  const keystore = await wallet.exportKeystore('your-secure-password');
  console.log('Keystore created (length):', keystore.length);

  // 3. Query Account Balance (with Auto-Funding)
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

  // 4. Send a Transaction (if we have funds)
  if ((account.balances?.DRT || 0) > 10) {
    // Send 10 DRT to another address (self for demo)
    const tx = await client.sendTokens({
      from: wallet,
      to: wallet.address,
      amount: 10,
      denom: 'DRT',
      memo: 'Payment for services'
    });

    console.log('Transaction hash:', tx.hash);

    // Wait for confirmation
    const receipt = await client.waitForTransaction(tx.hash);
    console.log('Status:', receipt.status); // 'success' or 'failed'
  }

  // 5. Query Transaction History
  try {
    const txs = await client.getTransactions({
      address: wallet.address,
      limit: 10
    });

    for (const tx of txs) {
      console.log(`${tx.type}: ${tx.amount} ${tx.denom} - ${tx.status}`);
    }
  } catch (error) {
    console.log('No transaction history available yet');
  }
}

quickStart().catch(console.error);
