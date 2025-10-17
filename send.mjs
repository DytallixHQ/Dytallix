import { initPQC, PQCWallet, DytallixClient } from '@dytallix/sdk';
import { readFile } from 'node:fs/promises';

await initPQC();
const client = new DytallixClient({ rpcUrl: 'https://dytallix.com/rpc', chainId: 'dyt-local-1' });

const ks = await readFile('keystore.json','utf-8');
const wallet = await PQCWallet.importKeystore(ks, 'change-this-password');

// send to self by default; override with DYT_TO=dyt1...
const to = process.env.DYT_TO || wallet.address;

const tx = await client.sendTokens({
  from: wallet,
  to,
  amount: 1,
  denom: 'DRT',
  memo: 'hello dytallix'
});

console.log('TX hash:', tx.hash);
const r = await client.waitForTransaction(tx.hash);
console.log('Status:', r.status, 'block:', r.block);
