# Security Guide: PQC Key Management

This document addresses the security vulnerability **CWE-316: Cleartext Storage of Sensitive Information in Memory** identified in the security audit.

## 🚨 Security Issue Identified

**Problem**: Keys not zeroized on browser navigation/beforeunload  
**Vulnerability**: CWE-316 - Cleartext Storage of Sensitive Information in Memory  
**Risk Level**: **HIGH**  
**Impact**: Cryptographic keys may persist in browser memory after user navigates away

### Attack Vectors

1. **Memory Dumps**: Malicious browser extensions or debugging tools accessing JavaScript heap
2. **Cross-Site Scripting (XSS)**: Scripts accessing memory through window object
3. **Browser Crashes**: Uncleared memory being written to swap files
4. **Developer Tools**: Keys visible in memory profilers and debuggers

## ✅ Security Solutions Implemented

### 1. EphemeralPQCKeyManager Class

A secure key management class that provides automatic memory cleanup:

```typescript
import { EphemeralPQCKeyManager } from '@dytallix/sdk';

// Create secure key manager with automatic cleanup
const keyManager = new EphemeralPQCKeyManager({
  enableBeforeUnloadCleanup: true,  // Auto-cleanup on navigation
  secureDeletePasses: 3,            // Multiple overwrite passes
  enableLogging: false              // Security logging (dev only)
});

// Generate ephemeral keys
const keyPair = await keyManager.generateKeys('ML-DSA');

// Keys are automatically cleaned up on:
// - Browser navigation (beforeunload event)
// - Manual cleanup call
// - Manager destruction

// Manual cleanup
keyManager.clearKeys();

// Destroy manager and all resources
keyManager.destroy();
```

### 2. Enhanced PQCWallet Class

The traditional `PQCWallet` class now includes basic security improvements:

```typescript
import { PQCWallet } from '@dytallix/sdk';

const wallet = await PQCWallet.generate('ML-DSA');

// Check if wallet has been destroyed
if (wallet.isWalletDestroyed()) {
  throw new Error('Wallet is no longer secure');
}

// Manually destroy wallet for security
wallet.destroy(); // Overwrites keys in memory

// All subsequent operations will throw security errors
```

### 3. React Hook (For React Applications)

For React applications, a secure hook implementation:

```typescript
// Note: This requires React to be available
import { useEphemeralPQCKeys } from '@dytallix/sdk';

function SecureWalletComponent() {
  // This will throw an error in non-React environments
  // Use EphemeralPQCKeyManager directly instead
  const { generateKeys, clearKeys, hasKeys } = useEphemeralPQCKeys({
    enableBeforeUnloadCleanup: true
  });
  
  // Component automatically cleans up keys on unmount
}
```

## 🔧 Implementation Guide

### For Browser Applications (Recommended)

Use `EphemeralPQCKeyManager` for maximum security:

```typescript
import { EphemeralPQCKeyManager } from '@dytallix/sdk';

class SecureWalletApp {
  private keyManager: EphemeralPQCKeyManager;

  constructor() {
    this.keyManager = new EphemeralPQCKeyManager({
      enableBeforeUnloadCleanup: true,
      secureDeletePasses: 3,
      enableLogging: process.env.NODE_ENV === 'development'
    });

    // Set up additional security measures
    this.setupSecurityHandlers();
  }

  private setupSecurityHandlers() {
    // Clear keys on tab visibility change (optional - may be too aggressive)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Optionally clear keys when tab becomes hidden
        // this.keyManager.clearKeys();
      }
    });

    // Clear keys on focus loss (optional)
    window.addEventListener('blur', () => {
      // Optionally clear keys when window loses focus
      // this.keyManager.clearKeys();
    });
  }

  async createWallet(): Promise<string> {
    try {
      const keyPair = await this.keyManager.generateKeys('ML-DSA');
      return keyPair.address;
    } catch (error) {
      console.error('Failed to create secure wallet:', error);
      throw error;
    }
  }

  async signTransaction(txObj: any): Promise<any> {
    if (!this.keyManager.hasKeys()) {
      throw new Error('No secure keys available. Generate wallet first.');
    }

    return await this.keyManager.signTransaction(txObj);
  }

  // Important: Call this when done with the application
  cleanup() {
    this.keyManager.destroy();
  }
}
```

### For Node.js Applications

Use traditional `PQCWallet` with manual cleanup:

```typescript
import { PQCWallet } from '@dytallix/sdk';

class NodeWalletService {
  private wallet: PQCWallet | null = null;

  async createWallet(): Promise<PQCWallet> {
    // Clean up existing wallet first
    if (this.wallet) {
      this.wallet.destroy();
    }

    this.wallet = await PQCWallet.generate('ML-DSA');
    return this.wallet;
  }

  cleanup() {
    if (this.wallet) {
      this.wallet.destroy();
      this.wallet = null;
    }
  }
}

// Important: Set up process cleanup handlers
process.on('exit', () => {
  // Clean up any wallet instances
});

process.on('SIGINT', () => {
  // Clean up and exit gracefully
  process.exit(0);
});
```

## 🛡️ Security Features Implemented

### 1. Secure Memory Management

- **ArrayBuffer Storage**: Keys stored in `ArrayBuffer` instead of strings for better memory control
- **Multiple Overwrite Passes**: 3-pass secure deletion with different patterns (0x00, 0xFF, 0x55, random)
- **Immediate Cleanup**: Keys cleared immediately on navigation/unload events

### 2. Event-Driven Cleanup

- **beforeunload Handler**: Automatic cleanup when user navigates away
- **Component Unmount**: Cleanup when React components unmount
- **Manual Cleanup**: `clearKeys()` method for explicit cleanup
- **Destruction**: `destroy()` method for complete resource cleanup

### 3. Memory Wiping Algorithm

```typescript
function secureWipeArrayBuffer(buffer: ArrayBuffer, passes: number = 3): void {
  const view = new Uint8Array(buffer);
  
  for (let pass = 0; pass < passes; pass++) {
    // Different patterns for each pass
    const patterns = [0x00, 0xFF, 0x55, 0xAA];
    const pattern = patterns[pass % patterns.length];
    
    for (let i = 0; i < view.length; i++) {
      view[i] = pattern;
    }
  }
  
  // Final random overwrite
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(view);
  }
}
```

### 4. State Validation

- **Destroyed State Checking**: All operations validate wallet hasn't been destroyed
- **Security Exceptions**: Clear error messages when accessing destroyed wallets
- **Memory State Tracking**: Internal flags to track cleanup status

## 📋 Security Checklist

### ✅ Immediate Actions Completed

- [x] Created `EphemeralPQCKeyManager` class with automatic cleanup
- [x] Added `beforeunload` event handlers for navigation cleanup
- [x] Implemented secure memory wiping with multiple overwrite passes
- [x] Added state validation to prevent use of destroyed wallets
- [x] Enhanced `PQCWallet` class with `destroy()` method
- [x] Created comprehensive security documentation

### 🔄 Recommended Follow-up Actions

- [ ] **Security Testing**: Verify keys are actually cleared from memory using browser memory profilers
- [ ] **Performance Testing**: Measure impact of secure deletion on application performance
- [ ] **User Experience**: Test beforeunload warnings don't interfere with normal navigation
- [ ] **Cross-Browser Testing**: Verify cleanup works across different browsers
- [ ] **React Integration**: Create production-ready React hook with proper dependencies

## 🧪 Testing the Security Fix

### Manual Testing

1. **Memory Profiler Test**:
   ```javascript
   // In browser console
   const keyManager = new EphemeralPQCKeyManager({ enableLogging: true });
   await keyManager.generateKeys('ML-DSA');
   
   // Take memory snapshot
   // Navigate away or call clearKeys()
   // Take another memory snapshot
   // Verify keys are not present in second snapshot
   ```

2. **Navigation Test**:
   ```javascript
   // Generate keys
   const keyManager = new EphemeralPQCKeyManager();
   await keyManager.generateKeys('ML-DSA');
   
   // Try to navigate away - should see cleanup message
   window.location.href = 'https://example.com';
   ```

3. **State Validation Test**:
   ```javascript
   const wallet = await PQCWallet.generate('ML-DSA');
   wallet.destroy();
   
   try {
     await wallet.signTransaction({}); // Should throw error
   } catch (error) {
     console.log('✅ Security error caught:', error.message);
   }
   ```

### Automated Testing

```typescript
describe('Security: Key Memory Management', () => {
  it('should clear keys on manager destruction', async () => {
    const keyManager = new EphemeralPQCKeyManager();
    await keyManager.generateKeys('ML-DSA');
    
    expect(keyManager.hasKeys()).toBe(true);
    
    keyManager.destroy();
    
    expect(keyManager.hasKeys()).toBe(false);
    expect(() => keyManager.getAddress()).toThrow();
  });

  it('should prevent operations on destroyed wallet', async () => {
    const wallet = await PQCWallet.generate('ML-DSA');
    wallet.destroy();
    
    await expect(wallet.signTransaction({})).rejects.toThrow('destroyed');
    expect(() => wallet.getPublicKey()).toThrow('destroyed');
  });
});
```

## 🔗 Related Security Considerations

1. **HTTPS Only**: Always serve applications over HTTPS to prevent network interception
2. **Content Security Policy**: Implement strict CSP to prevent XSS attacks
3. **Secure Headers**: Use security headers like `X-Frame-Options`, `X-Content-Type-Options`
4. **Regular Updates**: Keep dependencies updated for security patches
5. **Code Obfuscation**: Consider obfuscating production JavaScript to make reverse engineering harder

## 📚 References

- [CWE-316: Cleartext Storage of Sensitive Information in Memory](https://cwe.mitre.org/data/definitions/316.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [MDN Web API: beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
- [MDN Web API: ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)

---

**Security Note**: While these measures significantly improve security, remember that JavaScript running in the browser has inherent limitations. For maximum security in production applications, consider server-side key management with hardware security modules (HSMs) or secure enclaves.
