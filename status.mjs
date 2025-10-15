import { DytallixClient } from '@dytallix/sdk';
const client = new DytallixClient({
  rpcUrl: process.env.DYTALLIX_RPC_URL || 'https://dytallix.com/rpc',
  chainId: process.env.DYTALLIX_CHAIN_ID || 'dyt-local-1',
  timeout: 30000
});
const s = await client.getStatus();
console.log('RPC:', 'https://dytallix.com/rpc');
console.log('Chain:', 'dyt-local-1');
console.log('Block height:', s?.block_height ?? s?.blockHeight ?? JSON.stringify(s));
