import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({ 
  rpcUrl: 'https://dytallix.com/rpc', 
  chainId: 'dyt-local-1' 
});

const addr = process.argv[2] || 'dyt1faucet00000000000';

console.log('Fetching account:', addr);

// Get raw response
const acct = await client.getAccount(addr);

console.log('\nFull response:', JSON.stringify(acct, null, 2));
console.log('\nBalances object:', acct.balances);
console.log('DGT:', acct.balances?.DGT);
console.log('DRT:', acct.balances?.DRT);
