// Basic usage example for Dytallix SDK
import { DytallixClient } from '@dytallix/sdk';

async function main() {
  // Connect to Dytallix network
  const client = new DytallixClient({
    rpcUrl: 'https://dytallix.com/rpc',
    chainId: 'dyt-local-1'
  });

  // Get node status
  const status = await client.getStatus();
  console.log('Connected to Dytallix');
  console.log('Block height:', status.block_height);
  console.log('Chain ID:', status.chain_id);

  // Query an account balance
  const address = 'dyt1...'; // Your address
  const account = await client.getAccount(address);
  console.log('Address:', address);
  console.log('DGT Balance:', account.balances.DGT);
  console.log('DRT Balance:', account.balances.DRT);
  console.log('Nonce:', account.nonce);
}

main().catch(console.error);
