/**
 * Complete Dytallix SDK Example
 * 
 * This example demonstrates:
 * - Wallet creation and management
 * - Balance checking with auto-funding
 * - Token transfers
 * - Transaction history
 */

import { initPQC, PQCWallet, DytallixClient } from '@dytallix/sdk';
import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function main() {
  console.log('🚀 Dytallix SDK Complete Example\n');

  // 1. Initialize PQC Module (required for wallet operations)
  console.log('📦 Initializing PQC WASM module...');
  await initPQC();
  console.log('✅ PQC module initialized\n');

  // 2. Connect to Dytallix
  console.log('🔗 Connecting to Dytallix network...');
  const client = new DytallixClient({
    rpcUrl: 'https://dytallix.com/rpc',
    chainId: 'dyt-local-1'
  });

  // Check network status
  const status = await client.getStatus();
  console.log(`✅ Connected to ${status.chain_id} at block ${status.block_height}\n`);

  // 3. Create or Load Wallet
  let wallet;
  const keystoreFile = 'example-keystore.json';
  
  if (existsSync(keystoreFile)) {
    console.log('📂 Loading existing wallet...');
    const keystoreJson = await readFile(keystoreFile, 'utf-8');
    wallet = await PQCWallet.importKeystore(keystoreJson, 'demo-password-123');
    console.log(`✅ Wallet loaded: ${wallet.address}`);
  } else {
    console.log('🔑 Creating new wallet...');
    wallet = await PQCWallet.generate('dilithium5');
    
    // Save encrypted keystore
    const keystoreJson = await wallet.exportKeystore('demo-password-123');
    await writeFile(keystoreFile, keystoreJson);
    
    console.log(`✅ New wallet created: ${wallet.address}`);
    console.log(`💾 Keystore saved to: ${keystoreFile}`);
  }
  
  console.log(`🔒 Algorithm: ${wallet.algorithm}\n`);

  // 4. Check Balance (with Auto-Funding)
  console.log('💰 Checking account balance...');
  let account = await client.getAccount(wallet.address);
  
  console.log(`DGT Balance: ${account.balances.DGT || 0}`);
  console.log(`DRT Balance: ${account.balances.DRT || 0}`);
  console.log(`Nonce: ${account.nonce}`);

  // Auto-fund if empty
  const totalBalance = (account.balances.DGT || 0) + (account.balances.DRT || 0);
  if (totalBalance === 0) {
    console.log('\n🪣 Wallet is empty. Requesting funds from faucet...');
    console.log('   Requesting: 100 DGT + 1000 DRT');
    
    const faucetResult = await client.requestFromFaucet(wallet.address);
    
    if (faucetResult.success) {
      console.log(`✅ ${faucetResult.message}`);
      if (faucetResult.credited) {
        console.log(`💳 Credited: ${JSON.stringify(faucetResult.credited)}`);
      }
      
      // Wait and re-check balance
      console.log('⏳ Waiting for confirmation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      account = await client.getAccount(wallet.address);
      console.log(`\n🔄 Updated Balances:`);
      console.log(`   DGT: ${account.balances.DGT || 0}`);
      console.log(`   DRT: ${account.balances.DRT || 0}`);
    } else {
      console.log(`❌ Faucet request failed: ${faucetResult.message}`);
    }
  }

  // 5. Send Transaction (only if we have funds)
  if ((account.balances.DRT || 0) > 1) {
    console.log('\n📤 Sending test transaction...');
    
    try {
      const tx = await client.sendTokens({
        from: wallet,
        to: wallet.address, // Send to self for demo
        amount: 1,
        denom: 'DRT',
        memo: 'SDK demo transaction'
      });

      console.log(`✅ Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      const receipt = await client.waitForTransaction(tx.hash);
      console.log(`🎉 Transaction ${receipt.status} in block ${receipt.block}`);
      
    } catch (error) {
      console.log(`❌ Transaction failed: ${error.message}`);
    }
  } else {
    console.log('\n💡 Insufficient DRT balance for transaction demo');
  }

  // 6. Query Transaction History
  console.log('\n📜 Recent transaction history:');
  try {
    const transactions = await client.getTransactions({
      address: wallet.address,
      limit: 5
    });

    if (transactions.length > 0) {
      transactions.forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.type}: ${tx.amount} ${tx.denom} - ${tx.status}`);
      });
    } else {
      console.log('  No transactions found');
    }
  } catch (error) {
    console.log(`  ⚠️  Could not fetch transaction history: ${error.message}`);
  }

  console.log('\n🏁 Example completed successfully!');
}

// Run the example
main().catch(error => {
  console.error('💥 Example failed:', error);
  process.exit(1);
});
