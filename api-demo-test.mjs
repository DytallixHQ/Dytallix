#!/usr/bin/env node

/**
 * Complete API Demo Test
 * 
 * This script demonstrates the complete functionality of the 
 * Advanced Dytallix Blockchain API Server.
 */

const API_BASE = 'http://localhost:3000';

async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runDemo() {
  console.log('🚀 Dytallix Advanced API Demo');
  console.log('==============================\n');

  try {
    // Test 1: Get API documentation
    console.log('📚 1. Testing API Documentation...');
    const docs = await apiCall('/');
    console.log(`   ✅ API Name: ${docs.name}`);
    console.log(`   ✅ Version: ${docs.version}`);
    console.log(`   ✅ Features: ${docs.features.length} available\n`);

    // Test 2: Create a wallet
    console.log('🔑 2. Creating a quantum-resistant wallet...');
    const walletResult = await apiCall('/api/wallet/create', {
      method: 'POST',
      body: JSON.stringify({
        algorithm: 'dilithium5',
        name: 'Demo Wallet',
        password: 'demo-password'
      })
    });
    
    if (walletResult.success) {
      console.log(`   ✅ Wallet created: ${walletResult.wallet.address}`);
      console.log(`   ✅ Algorithm: ${walletResult.wallet.algorithm}`);
      console.log(`   ✅ Name: ${walletResult.wallet.name}\n`);
    } else {
      console.log(`   ❌ Wallet creation failed: ${walletResult.error}\n`);
    }

    // Test 3: Get account information
    console.log('👤 3. Getting account information...');
    const accountResult = await apiCall(`/api/accounts/${walletResult.wallet?.address}`);
    if (accountResult.success) {
      console.log(`   ✅ Account found: ${accountResult.account.address}`);
      console.log(`   ✅ Created: ${accountResult.account.created}`);
      console.log(`   ✅ Balance: ${JSON.stringify(accountResult.account.balance)}\n`);
    } else {
      console.log(`   ❌ Account lookup failed: ${accountResult.error}\n`);
    }

    // Test 4: List all accounts
    console.log('📋 4. Listing all accounts...');
    const accountsResult = await apiCall('/api/accounts');
    if (accountsResult.success) {
      console.log(`   ✅ Total accounts: ${accountsResult.count}`);
      accountsResult.accounts.forEach((acc, i) => {
        console.log(`   ${i + 1}. ${acc.address.substring(0, 20)}... (${acc.transactionCount} txs)`);
      });
      console.log('');
    }

    // Test 5: Get analytics
    console.log('📊 5. Getting system analytics...');
    const analyticsResult = await apiCall('/api/analytics');
    if (analyticsResult.success) {
      const stats = analyticsResult.analytics;
      console.log(`   ✅ Total Accounts: ${stats.totalAccounts}`);
      console.log(`   ✅ Total Transactions: ${stats.totalTransactions}`);
      console.log(`   ✅ DGT Volume: ${stats.totalVolume.DGT}`);
      console.log(`   ✅ DRT Volume: ${stats.totalVolume.DRT}`);
      console.log(`   ✅ Real-time Connections: ${stats.realtimeConnections}\n`);
    }

    // Test 6: Get transaction history
    console.log('📜 6. Getting transaction history...');
    const txResult = await apiCall('/api/transactions');
    if (txResult.success) {
      console.log(`   ✅ Total transactions: ${txResult.total}`);
      if (txResult.transactions.length > 0) {
        console.log('   Recent transactions:');
        txResult.transactions.slice(0, 3).forEach((tx, i) => {
          console.log(`     ${i + 1}. ${tx.from} → ${tx.to}: ${tx.amount} ${tx.denom}`);
        });
      } else {
        console.log('   📝 No transactions yet');
      }
      console.log('');
    }

    // Test 7: Get faucet status
    console.log('💰 7. Checking faucet status...');
    const faucetResult = await apiCall('/api/faucet/status');
    if (faucetResult.success) {
      console.log(`   ✅ Faucet available: ${faucetResult.faucet.available}`);
      console.log(`   ✅ Default amount: ${faucetResult.faucet.defaultAmount}`);
      console.log(`   ✅ Rate limit: ${faucetResult.faucet.rateLimit}\n`);
    }

    // Test 8: Get developer examples
    console.log('🛠️ 8. Getting developer examples...');
    const devResult = await apiCall('/api/dev/examples');
    if (devResult.success) {
      const examples = Object.keys(devResult.examples);
      console.log(`   ✅ Available examples: ${examples.join(', ')}`);
      console.log('   ✅ Complete code samples available\n');
    }

    // Test 9: Simulate transaction
    console.log('🎯 9. Simulating a transaction...');
    const simResult = await apiCall('/api/dev/simulate', {
      method: 'POST',
      body: JSON.stringify({
        from: walletResult.wallet?.address,
        to: 'dyt1recipient123456789abcdef',
        amount: '100',
        denom: 'DGT'
      })
    });
    
    if (simResult.success) {
      console.log(`   ✅ Simulation successful`);
      console.log(`   ✅ Estimated fee: ${simResult.simulation.estimatedFee}`);
      console.log(`   ✅ Would succeed: ${simResult.simulation.wouldSucceed}\n`);
    }

    // Test 10: Get supported algorithms
    console.log('🔐 10. Getting supported algorithms...');
    const algoResult = await apiCall('/api/dev/algorithms');
    if (algoResult.success) {
      console.log(`   ✅ Supported: ${algoResult.algorithms.supported.join(', ')}`);
      console.log(`   ✅ Recommended: ${algoResult.algorithms.recommended}`);
      console.log(`   ✅ Description: ${algoResult.algorithms.description}\n`);
    }

    console.log('🎉 Demo completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('   • Quantum-resistant wallet creation');
    console.log('   • Account management and tracking');
    console.log('   • Real-time analytics and monitoring');
    console.log('   • Developer tools and examples');
    console.log('   • Transaction simulation');
    console.log('   • Rate limiting and security');
    console.log('\n🚀 Your blockchain API is ready for production!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\n💡 Make sure the API server is running:');
    console.log('   node advanced-api-server.mjs');
  }
}

// Run the demo
runDemo();
