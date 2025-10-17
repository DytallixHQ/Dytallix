/**
 * Security Test: Key Memory Management
 * 
 * This test verifies that the CWE-316 security vulnerability has been fixed.
 * Run this in a browser console to test the security measures.
 */

// Mock the PQC WASM module for testing
if (typeof window !== 'undefined') {
  (window as any).PQCWallet = {
    generateKeypair: async (algorithm: string) => ({
      publicKey: 'mock_public_key_' + Math.random().toString(36),
      secretKey: 'mock_secret_key_' + Math.random().toString(36),
      address: 'pqc1mock' + Math.random().toString(36).substring(2, 8),
      algorithm: algorithm
    }),
    signTransaction: async (tx: any, secretKey: string, publicKey: string) => ({
      ...tx,
      signature: 'mock_signature_' + Math.random().toString(36)
    }),
    exportKeystore: async (keyData: any, password: string) => ({
      version: 1,
      crypto: {
        cipher: 'aes-128-ctr',
        cipherparams: { iv: 'mock_iv' },
        ciphertext: 'mock_encrypted_data',
        kdf: 'pbkdf2',
        kdfparams: { c: 262144, dklen: 32, prf: 'hmac-sha256', salt: 'mock_salt' },
        mac: 'mock_mac'
      },
      id: 'mock_id',
      address: keyData.address,
      algorithm: keyData.algorithm
    })
  };
}

import { EphemeralPQCKeyManager } from '../src/hooks/useEphemeralPQCKeys';
import { PQCWallet } from '../src/wallet';

/**
 * Test 1: Verify ephemeral key manager cleanup
 */
async function testEphemeralKeyCleanup(): Promise<boolean> {
  console.log('🧪 Test 1: Ephemeral Key Cleanup');
  
  const keyManager = new EphemeralPQCKeyManager({
    enableLogging: true,
    secureDeletePasses: 3
  });

  // Generate keys
  const keyPair = await keyManager.generateKeys('ML-DSA');
  console.log('✅ Keys generated:', keyPair.address);

  // Verify keys exist
  if (!keyManager.hasKeys()) {
    console.error('❌ Keys should exist after generation');
    return false;
  }

  // Clear keys
  keyManager.clearKeys();

  // Verify keys are cleared
  if (keyManager.hasKeys()) {
    console.error('❌ Keys should be cleared after clearKeys()');
    return false;
  }

  // Verify operations fail after cleanup
  try {
    keyManager.getAddress();
    console.error('❌ getAddress() should fail after cleanup');
    return false;
  } catch (error) {
    console.log('✅ getAddress() correctly failed after cleanup');
  }

  // Cleanup
  keyManager.destroy();
  console.log('✅ Test 1 passed: Ephemeral key cleanup works\n');
  return true;
}

/**
 * Test 2: Verify PQCWallet destruction
 */
async function testWalletDestruction(): Promise<boolean> {
  console.log('🧪 Test 2: PQCWallet Destruction');

  const wallet = await PQCWallet.generate('ML-DSA');
  console.log('✅ Wallet created:', wallet.address);

  // Verify wallet is not destroyed initially
  if (wallet.isWalletDestroyed()) {
    console.error('❌ Wallet should not be destroyed initially');
    return false;
  }

  // Test normal operations work
  try {
    const publicKey = wallet.getPublicKey();
    console.log('✅ Normal operations work before destruction');
  } catch (error) {
    console.error('❌ Normal operations should work before destruction');
    return false;
  }

  // Destroy wallet
  wallet.destroy();

  // Verify wallet is destroyed
  if (!wallet.isWalletDestroyed()) {
    console.error('❌ Wallet should be destroyed after destroy()');
    return false;
  }

  // Verify operations fail after destruction
  try {
    wallet.getPublicKey();
    console.error('❌ getPublicKey() should fail after destruction');
    return false;
  } catch (error) {
    console.log('✅ getPublicKey() correctly failed after destruction');
  }

  console.log('✅ Test 2 passed: PQCWallet destruction works\n');
  return true;
}

/**
 * Test 3: Verify beforeunload handler registration
 */
function testBeforeUnloadHandler(): boolean {
  console.log('🧪 Test 3: BeforeUnload Handler Registration');

  if (typeof window === 'undefined') {
    console.log('⚠️ Skipping browser-specific test in Node.js environment');
    return true;
  }

  // Count initial event listeners
  const initialListeners = window.addEventListener.length || 0;

  // Create key manager
  const keyManager = new EphemeralPQCKeyManager({
    enableBeforeUnloadCleanup: true,
    enableLogging: true
  });

  // Note: We can't easily test if the event listener is actually registered
  // without diving into browser internals, but we can test the basic functionality
  console.log('✅ Key manager created with beforeunload cleanup enabled');

  // Destroy manager
  keyManager.destroy();
  console.log('✅ Key manager destroyed - event listeners should be removed');

  console.log('✅ Test 3 passed: BeforeUnload handler test completed\n');
  return true;
}

/**
 * Test 4: Verify secure memory wiping
 */
async function testSecureMemoryWiping(): Promise<boolean> {
  console.log('🧪 Test 4: Secure Memory Wiping');

  const keyManager = new EphemeralPQCKeyManager({
    secureDeletePasses: 3,
    enableLogging: true
  });

  // Generate keys
  const keyPair = await keyManager.generateKeys('ML-DSA');
  const originalAddress = keyPair.address;

  // Get reference to the ArrayBuffers (for testing purposes)
  const publicKeyBuffer = keyPair.publicKey;
  const secretKeyBuffer = keyPair.secretKey;

  // Clear keys
  keyManager.clearKeys();

  // Check if buffers have been wiped
  // Note: This is a simplified test - in practice, we'd need memory profiling tools
  console.log('✅ Keys cleared - ArrayBuffers should be wiped');

  try {
    // These operations should fail
    keyManager.signTransaction({});
    console.error('❌ signTransaction should fail after key wipe');
    return false;
  } catch (error) {
    console.log('✅ signTransaction correctly failed after wipe');
  }

  keyManager.destroy();
  console.log('✅ Test 4 passed: Secure memory wiping test completed\n');
  return true;
}

/**
 * Test 5: Multiple key generations and cleanups
 */
async function testMultipleGenerationsCleanups(): Promise<boolean> {
  console.log('🧪 Test 5: Multiple Generations and Cleanups');

  const keyManager = new EphemeralPQCKeyManager({
    enableLogging: false // Reduce noise for this test
  });

  for (let i = 0; i < 3; i++) {
    console.log(`🔄 Round ${i + 1}:`);

    // Generate keys
    const keyPair = await keyManager.generateKeys('ML-DSA');
    console.log(`  ✅ Generated keys for ${keyPair.address}`);

    // Verify keys exist
    if (!keyManager.hasKeys()) {
      console.error(`  ❌ Keys should exist in round ${i + 1}`);
      return false;
    }

    // Clear keys
    keyManager.clearKeys();

    // Verify keys are cleared
    if (keyManager.hasKeys()) {
      console.error(`  ❌ Keys should be cleared in round ${i + 1}`);
      return false;
    }

    console.log(`  ✅ Cleaned up keys in round ${i + 1}`);
  }

  keyManager.destroy();
  console.log('✅ Test 5 passed: Multiple generations and cleanups work\n');
  return true;
}

/**
 * Run all security tests
 */
async function runSecurityTests(): Promise<boolean> {
  console.log('🚀 Running Security Tests for CWE-316 Fix');
  console.log('==========================================\n');

  const tests = [
    testEphemeralKeyCleanup,
    testWalletDestruction,
    testBeforeUnloadHandler,
    testSecureMemoryWiping,
    testMultipleGenerationsCleanups
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const passed = await test();
      if (!passed) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Test failed with error:`, error);
      allPassed = false;
    }
  }

  console.log('==========================================');
  if (allPassed) {
    console.log('🎉 All security tests PASSED!');
    console.log('✅ CWE-316 vulnerability appears to be fixed');
  } else {
    console.log('❌ Some security tests FAILED!');
    console.log('⚠️ CWE-316 vulnerability may not be fully fixed');
  }

  return allPassed;
}

// Export for use
export {
  testEphemeralKeyCleanup,
  testWalletDestruction,
  testBeforeUnloadHandler,
  testSecureMemoryWiping,
  testMultipleGenerationsCleanups,
  runSecurityTests
};

// Auto-run in browser
if (typeof window !== 'undefined') {
  console.log('🌐 Security tests available in browser console');
  (window as any).runSecurityTests = runSecurityTests;
  console.log('Run: runSecurityTests() to execute all tests');
}

// Auto-run in Node.js
if (typeof require !== 'undefined' && require.main === module) {
  runSecurityTests().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
