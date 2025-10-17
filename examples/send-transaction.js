// Send a transaction
import { DytallixClient, PQCWallet, initPQC } from '@dytallix/sdk';

async function main() {
  // Initialize PQC WASM module (required once per app)
  await initPQC();
  
  // Connect to Dytallix network
  const client = new DytallixClient({
    rpcUrl: 'https://dytallix.com/rpc',
    chainId: 'dyt-local-1'
  });

  // Load your wallet from keystore (in production, load securely from storage)
  // For demo, we'll generate a new wallet
  const wallet = await PQCWallet.generate('dilithium5');
  
  // Or load from existing keystore:
  // const keystoreJson = await fs.readFile('keystore.json', 'utf-8');
  // const wallet = await PQCWallet.fromKeystore(keystoreJson, 'your-password');

  // Transaction details
  const recipient = 'dyt1...recipient_address';
  const amount = 10; // 10 DRT tokens
  
  // Send tokens
  const tx = await client.sendTokens({
    from: wallet,
    to: recipient,
    amount: amount,
    denom: 'DRT',
    memo: 'Payment for services'
  });

  console.log('Transaction sent!');
  console.log('TX Hash:', tx.hash);
  
  // Wait for confirmation
  const receipt = await client.waitForTransaction(tx.hash);
  console.log('Status:', receipt.status); // 'success' or 'failed'
  console.log('Block:', receipt.block);
}

main().catch(console.error);
