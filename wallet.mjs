import { initPQC, PQCWallet } from '@dytallix/sdk';

await initPQC();                           // required for wallet ops
const w = await PQCWallet.generate('ML-DSA');  // or 'SLH-DSA'
console.log('Address:', w.address);

const walletJson = JSON.stringify(w.toJSON(), null, 2);
await (await import('node:fs/promises')).writeFile('wallet.json', walletJson);
console.log('Saved wallet.json (WARNING: Contains unencrypted private key!)');
