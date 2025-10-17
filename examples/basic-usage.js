// Basic usage example for Dytallix SDK
import { DytallixClient } from '@dytallix/sdk';

async function main() {
  // Connect to Dytallix testnet
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
  const balance = await client.getBalance(address);
  console.log('Balance:', balance);
}

main().catch(console.error);
