#!/usr/bin/env node
/**
 * Balance Checker with Auto-Funding
 * 
 * Usage: node examples/check-balance.mjs <address>
 * 
 * Features:
 * - Check account balance and nonce
 * - Auto-request funds from faucet if wallet is empty
 * - Verify funding after request
 */

import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({ 
  rpcUrl: 'https://dytallix.com/rpc', 
  chainId: 'dyt-local-1' 
});

const address = process.argv[2];
if (!address) { 
  console.error('Usage: node check-balance.mjs <address>'); 
  process.exit(1); 
}

console.log('🔍 Checking balance for:', address);

// Get account details
const account = await client.getAccount(address).catch(e => ({
  balances: {}, 
  nonce: 0, 
  error: e?.message
}));

console.log('\n📊 Account Details:');
console.log(`   Address: ${address}`);
console.log(`   DGT Balance: ${account.balances?.DGT || 0}`);
console.log(`   DRT Balance: ${account.balances?.DRT || 0}`);
console.log(`   Nonce: ${account.nonce ?? 0}`);

if (account.error) {
  console.log(`   ⚠️  Warning: ${account.error}`);
}

// Auto-fund if wallet has no balance
const totalBalance = (account.balances?.DGT || 0) + (account.balances?.DRT || 0);
if (totalBalance === 0) {
  console.log('\n💰 Wallet has no funds. Requesting from faucet...');
  console.log('   Requesting: 100 DGT + 1000 DRT');
  
  try {
    const result = await client.requestFromFaucet(address);
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
      if (result.credited) {
        console.log('💳 Credited amounts:');
        Object.entries(result.credited).forEach(([denom, amount]) => {
          console.log(`   ${denom}: ${amount}`);
        });
      }
      
      // Wait a moment and check balance again
      console.log('\n⏳ Waiting for confirmation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedAccount = await client.getAccount(address).catch(e => ({
        balances: {}, 
        nonce: 0, 
        error: e?.message
      }));
      
      console.log('\n🔄 Updated Account Details:');
      console.log(`   DGT Balance: ${updatedAccount.balances?.DGT || 0}`);
      console.log(`   DRT Balance: ${updatedAccount.balances?.DRT || 0}`);
      console.log(`   Nonce: ${updatedAccount.nonce ?? 0}`);
    } else {
      console.log(`❌ Faucet request failed: ${result.message}`);
      console.log('💡 The faucet may be unavailable or you may have reached the request limit.');
      console.log('   Try again later or contact support for testnet tokens.');
    }
  } catch (error) {
    console.log(`❌ Error requesting from faucet: ${error.message}`);
  }
} else {
  console.log('\n✅ Wallet has sufficient funds!');
}
