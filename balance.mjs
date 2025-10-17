import { DytallixClient } from '@dytallix/sdk';
const client = new DytallixClient({ rpcUrl: 'https://dytallix.com/rpc', chainId: 'dyt-local-1' });

const addr = process.argv[2];
if (!addr) { console.error('Usage: node balance.mjs <address>'); process.exit(1); }

const acct = await client.getAccount(addr).catch(e=>({balances:{}, nonce:0, error:e?.message}));
console.log('Account:', addr);
console.log('Balances:', acct.balances || {});
console.log('Nonce:', acct.nonce ?? 0);

// Auto-fund if wallet has no balance
const totalBalance = (acct.balances?.DGT || 0) + (acct.balances?.DRT || 0);
if (totalBalance === 0) {
  console.log('\n💰 Wallet has no funds. Requesting from faucet...');
  console.log('   Requesting: 100 DGT + 1000 DRT');
  const result = await client.requestFromFaucet(addr);
  
  if (result.success) {
    console.log('✅', result.message);
    if (result.credited) {
      console.log('� Credited:', result.credited);
    }
    
    // Wait a moment and check balance again
    console.log('\n⏳ Waiting for confirmation...');
    await new Promise(r => setTimeout(r, 2000));
    
    const newAcct = await client.getAccount(addr).catch(e=>({balances:{}, nonce:0, error:e?.message}));
    console.log('\n🔄 Updated Balances:', newAcct.balances || {});
  } else {
    console.log('❌ Faucet request failed:', result.message);
    console.log('💡 You may need to request tokens manually or the faucet may be unavailable.');
  }
}
