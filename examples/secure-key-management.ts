/**
 * Example: Secure PQC Key Management
 * 
 * This example demonstrates how to use the new secure key management
 * features to address CWE-316 security vulnerability.
 */

// Note: Import from the actual file paths since the exports might not be ready
import { EphemeralPQCKeyManager } from '../src/hooks/useEphemeralPQCKeys';
import { PQCWallet, PQCAlgorithm } from '../src/wallet';
import { DytallixClient } from '../src/client';

// Example 1: Using EphemeralPQCKeyManager (Recommended for browsers)
async function secureWalletExample() {
  console.log('🔐 Creating secure ephemeral wallet...');

  // Create key manager with security features enabled
  const keyManager = new EphemeralPQCKeyManager({
    enableBeforeUnloadCleanup: true,  // Auto-cleanup on navigation
    secureDeletePasses: 3,            // Multiple overwrite passes  
    enableLogging: true               // Enable for demo (disable in production)
  });

  try {
    // Generate ephemeral keys
    const keyPair = await keyManager.generateKeys('ML-DSA');
    console.log('✅ Secure keys generated for address:', keyPair.address);

    // Initialize client
    const client = new DytallixClient({
      rpcUrl: 'https://dytallix.com/api/',
      chainId: 'dytallix-testnet-1'
    });

    // Check account balance
    const account = await client.getAccount(keyPair.address);
    console.log('💰 Account balance:', account.balances);

    // Sign a transaction using ephemeral keys
    if ((account.balances.DGT || 0) > 0) {
      const tx = {
        from: keyPair.address,
        to: 'pqc1ml...',  // Replace with actual recipient
        amount: 1,
        denom: 'DGT'
      };

      const signedTx = await keyManager.signTransaction(tx);
      console.log('✅ Transaction signed securely');
    }

    // Export keystore securely
    const keystore = await keyManager.exportKeystore('secure-password-123');
    console.log('📦 Keystore exported securely');

    // Manual cleanup (automatic cleanup happens on navigation)
    console.log('🧹 Manually cleaning up keys...');
    keyManager.clearKeys();

  } catch (error) {
    console.error('❌ Secure wallet error:', error);
  } finally {
    // Always destroy manager to cleanup resources
    keyManager.destroy();
    console.log('🗑️ Key manager destroyed');
  }
}

// Example 2: Enhanced PQCWallet with security features
async function enhancedWalletExample() {
  console.log('🔐 Creating enhanced PQC wallet...');

  try {
    // Generate traditional wallet
    const wallet = await PQCWallet.generate('ML-DSA' as PQCAlgorithm);
    console.log('✅ Wallet created:', wallet.address);

    // Use wallet normally
    console.log('🔑 Public key:', wallet.getPublicKey().substring(0, 20) + '...');
    console.log('📍 Truncated address:', wallet.getTruncatedAddress());

    // Check if wallet is still secure
    if (!wallet.isWalletDestroyed()) {
      console.log('✅ Wallet is secure and ready for operations');
    }

    // Simulate some operations
    const keystore = await wallet.exportKeystore('secure-password-123');
    console.log('📦 Keystore exported');

    // Important: Destroy wallet when done for security
    console.log('🧹 Destroying wallet for security...');
    wallet.destroy();

    // Verify wallet is destroyed
    if (wallet.isWalletDestroyed()) {
      console.log('✅ Wallet securely destroyed');
    }

    // Attempting operations on destroyed wallet should fail
    try {
      wallet.getPublicKey();
    } catch (error) {
      console.log('✅ Security check passed:', error.message);
    }

  } catch (error) {
    console.error('❌ Enhanced wallet error:', error);
  }
}

// Example 3: Secure Web Application Class
class SecureDytallixApp {
  private keyManager: EphemeralPQCKeyManager;
  private client: DytallixClient;

  constructor() {
    // Initialize secure key manager
    this.keyManager = new EphemeralPQCKeyManager({
      enableBeforeUnloadCleanup: true,
      secureDeletePasses: 3,
      enableLogging: process.env.NODE_ENV === 'development'
    });

    // Initialize Dytallix client
    this.client = new DytallixClient({
      rpcUrl: 'https://dytallix.com/api/',
      chainId: 'dytallix-testnet-1'
    });

    // Set up additional security handlers
    this.setupSecurityHandlers();
  }

  private setupSecurityHandlers() {
    // Optional: Clear keys on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Page hidden - consider clearing keys');
        // Uncomment for aggressive security (may impact UX):
        // this.keyManager.clearKeys();
      }
    });

    // Optional: Clear keys on window blur
    window.addEventListener('blur', () => {
      console.log('🔍 Window lost focus');
      // Uncomment for aggressive security (may impact UX):
      // this.keyManager.clearKeys();
    });
  }

  async createWallet(): Promise<string> {
    try {
      const keyPair = await this.keyManager.generateKeys('ML-DSA');
      console.log('🎉 Secure wallet created:', keyPair.address);
      return keyPair.address;
    } catch (error) {
      console.error('❌ Failed to create secure wallet:', error);
      throw error;
    }
  }

  async getBalance(): Promise<any> {
    const address = this.keyManager.getAddress();
    if (!address) {
      throw new Error('No wallet available. Create a wallet first.');
    }

    const account = await this.client.getAccount(address);
    return account.balances;
  }

  async sendTokens(to: string, amount: number, denom: string = 'DGT'): Promise<string> {
    if (!this.keyManager.hasKeys()) {
      throw new Error('No secure keys available. Create wallet first.');
    }

    const address = this.keyManager.getAddress()!;
    
    // Build transaction
    const tx = {
      from: address,
      to: to,
      amount: amount,
      denom: denom,
      memo: 'Secure transaction'
    };

    // Sign with ephemeral keys
    const signedTx = await this.keyManager.signTransaction(tx);
    console.log('✅ Transaction signed securely');

    // In a real implementation, you would submit this to the blockchain
    return 'tx_hash_placeholder';
  }

  async exportWallet(password: string): Promise<string> {
    if (!this.keyManager.hasKeys()) {
      throw new Error('No wallet to export');
    }

    const keystore = await this.keyManager.exportKeystore(password);
    console.log('📦 Wallet exported securely');
    return keystore;
  }

  clearWallet(): void {
    this.keyManager.clearKeys();
    console.log('🧹 Wallet keys cleared securely');
  }

  // Important: Call this when app is being destroyed
  destroy(): void {
    this.keyManager.destroy();
    console.log('🗑️ Secure app destroyed');
  }
}

// Example 4: React Component Usage (pseudo-code)
function SecureWalletComponent() {
  console.log(`
  // For React applications, implement like this:
  
  import React, { useEffect, useState } from 'react';
  import { EphemeralPQCKeyManager } from '@dytallix/sdk';
  
  function SecureWallet() {
    const [keyManager] = useState(() => new EphemeralPQCKeyManager({
      enableBeforeUnloadCleanup: true
    }));
    const [address, setAddress] = useState(null);
  
    useEffect(() => {
      // Cleanup on component unmount
      return () => {
        keyManager.destroy();
      };
    }, [keyManager]);
  
    const createWallet = async () => {
      const keyPair = await keyManager.generateKeys('ML-DSA');
      setAddress(keyPair.address);
    };
  
    const clearWallet = () => {
      keyManager.clearKeys();
      setAddress(null);
    };
  
    return (
      <div>
        {address ? (
          <div>
            <p>Address: {address}</p>
            <button onClick={clearWallet}>Clear Wallet</button>
          </div>
        ) : (
          <button onClick={createWallet}>Create Secure Wallet</button>
        )}
      </div>
    );
  }
  `);
}

// Example 5: Demonstrating security vulnerability fix
async function securityDemonstration() {
  console.log('\n🔍 SECURITY DEMONSTRATION');
  console.log('========================');

  console.log('\n1. Creating ephemeral keys...');
  const keyManager = new EphemeralPQCKeyManager({ enableLogging: true });
  const keyPair = await keyManager.generateKeys('ML-DSA');
  
  console.log('2. Keys are now in memory');
  console.log('   Address:', keyPair.address);
  
  console.log('\n3. Simulating browser navigation/beforeunload...');
  // This would normally be triggered by actual navigation
  keyManager.clearKeys();
  
  console.log('4. Keys have been securely wiped from memory');
  console.log('   Has keys:', keyManager.hasKeys()); // Should be false
  
  try {
    keyManager.getAddress(); // Should throw error
  } catch (error) {
    console.log('✅ Security check passed - cannot access cleared keys');
  }
  
  keyManager.destroy();
  console.log('\n✅ Security demonstration complete');
}

// Run examples
async function runExamples() {
  console.log('🚀 Running Secure PQC Key Management Examples');
  console.log('=============================================\n');

  try {
    await secureWalletExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await enhancedWalletExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    const app = new SecureDytallixApp();
    await app.createWallet();
    const balance = await app.getBalance();
    console.log('💰 Balance:', balance);
    app.destroy();
    console.log('\n' + '='.repeat(50) + '\n');
    
    SecureWalletComponent(); // Just logs the React example
    console.log('\n' + '='.repeat(50) + '\n');
    
    await securityDemonstration();
    
  } catch (error) {
    console.error('❌ Example error:', error);
  }
}

// Export for use
export {
  secureWalletExample,
  enhancedWalletExample,
  SecureDytallixApp,
  securityDemonstration,
  runExamples
};

// Run if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('🌐 Running in browser - examples available in console');
  (window as any).runSecureExamples = runExamples;
  (window as any).SecureDytallixApp = SecureDytallixApp;
} else if (require.main === module) {
  // Node.js environment
  runExamples();
}
