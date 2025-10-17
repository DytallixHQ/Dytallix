// Create a PQC wallet
import { PQCWallet, initPQC } from '@dytallix/sdk';

async function main() {
  // Initialize PQC WASM module (required once per app)
  await initPQC();
  
  // Generate dilithium5 (quantum-resistant) wallet
  const wallet = await PQCWallet.generate('dilithium5');
  
  console.log('Wallet created!');
  console.log('Address:', wallet.address);
  console.log('Algorithm:', wallet.algorithm);
  
  // Export encrypted keystore for secure backup
  const keystore = await wallet.exportKeystore('your-secure-password');
  
  console.log('Keystore created for secure storage');
  console.log('Keystore size:', keystore.length, 'characters');
  
  // Save keystore to file (in real app, use secure storage)
  await (await import('node:fs/promises')).writeFile('keystore.json', keystore);
  console.log('Saved keystore.json');
  
  // IMPORTANT: Store keystore securely with a strong password!
  console.log('\n⚠️  Keep your keystore and password safe and never share them!');
  console.log('💡 Use the keystore to restore your wallet later with PQCWallet.fromKeystore()');
}

main().catch(console.error);
