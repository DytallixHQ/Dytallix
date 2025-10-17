import { PQCWallet } from '@dytallix/sdk';
import { readFile } from 'node:fs/promises';

const walletJson = JSON.parse(await readFile('wallet.json', 'utf-8'));
const wallet = PQCWallet.fromJSON(walletJson);

console.log('✅ Wallet loaded successfully!');
console.log('Address:', wallet.address);
console.log('Algorithm:', wallet.algorithm);
