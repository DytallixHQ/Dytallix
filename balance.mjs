import { DytallixClient } from '@dytallix/sdk';
const client = new DytallixClient({ rpcUrl: 'https://dytallix.com/rpc', chainId: 'dyt-local-1' });

const addr = process.argv[2];
if (!addr) { console.error('Usage: node balance.mjs <address>'); process.exit(1); }

const acct = await client.getAccount(addr).catch(e=>({balances:{}, nonce:0, error:e?.message}));
console.log('Account:', addr);
console.log('Balances:', acct.balances || {});
console.log('Nonce:', acct.nonce ?? 0);
