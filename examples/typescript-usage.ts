// TypeScript usage example
import { DytallixClient, PQCWallet, initPQC, type Account, type TransactionResponse, type TransactionReceipt } from '@dytallix/sdk';

async function demonstrateTypescript(): Promise<void> {
  // Initialize PQC WASM module (required once per app)
  await initPQC();

  // Client with full type safety
  const client = new DytallixClient({
    rpcUrl: 'https://dytallix.com/rpc',
    chainId: 'dyt-local-1'
  });

  // Type-safe wallet creation
  const wallet: PQCWallet = await PQCWallet.generate('dilithium5');
  const address: string = wallet.address; // Direct property access

  // Type-safe API calls
  const account: Account = await client.getAccount(address);
  console.log(`Address: ${address}`);
  console.log(`DGT Balance: ${account.balances.DGT}`);
  console.log(`DRT Balance: ${account.balances.DRT}`);
  console.log(`Nonce: ${account.nonce}`);

  // Auto-fund empty wallets from faucet
  const totalBalance = (account.balances.DGT || 0) + (account.balances.DRT || 0);
  if (totalBalance === 0) {
    console.log('💰 Requesting funds from faucet...');
    const result = await client.requestFromFaucet(address);
    if (result.success) {
      console.log('✅ Faucet funding successful!');
    }
  }

  // Strongly typed transaction response
  const tx: TransactionResponse = await client.sendTokens({
    from: wallet,
    to: 'dyt1...recipient',
    amount: 10,
    denom: 'DRT',
    memo: 'TypeScript transaction'
  });

  console.log('Transaction hash:', tx.hash);

  // Wait for confirmation with typed receipt
  const receipt: TransactionReceipt = await client.waitForTransaction(tx.hash);
  console.log('Status:', receipt.status); // 'success' or 'failed'
  console.log('Block:', receipt.block);
  console.log('Gas used:', receipt.gasUsed);
}

demonstrateTypescript().catch(console.error);
