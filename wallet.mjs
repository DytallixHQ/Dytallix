import { initPQC, PQCWallet } from '@dytallix/sdk';

await initPQC();                           // required for wallet ops
const w = await PQCWallet.generate('ML-DSA');  // or 'SLH-DSA'
console.log('Address:', w.address);

const ks = await w.exportKeystore('change-this-password');
await (await import('node:fs/promises')).writeFile('keystore.json', ks);
console.log('Saved keystore.json');
