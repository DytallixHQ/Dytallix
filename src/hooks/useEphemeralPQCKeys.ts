/**
 * Ephemeral PQC Key Management for Browser Applications
 * 
 * This module provides secure, ephemeral management of PQC cryptographic keys
 * with automatic memory cleanup on browser navigation and page unload.
 * 
 * Security Features:
 * - Automatic key zeroization on page unload
 * - beforeunload event handler for navigation cleanup
 * - Secure memory allocation using ArrayBuffer
 * - Multiple overwrite passes for secure deletion
 * 
 * Addresses: CWE-316 - Cleartext Storage of Sensitive Information in Memory
 */

export interface EphemeralKeyPair {
  publicKey: ArrayBuffer;
  secretKey: ArrayBuffer;
  address: string;
  algorithm: 'ML-DSA' | 'SLH-DSA';
}

export interface EphemeralKeyManagerOptions {
  /**
   * Whether to enable automatic cleanup on browser navigation
   * @default true
   */
  enableBeforeUnloadCleanup?: boolean;
  
  /**
   * Number of overwrite passes for secure deletion
   * @default 3
   */
  secureDeletePasses?: number;
  
  /**
   * Whether to log cleanup events (for debugging)
   * @default false
   */
  enableLogging?: boolean;
}

/**
 * Securely overwrite ArrayBuffer contents multiple times
 */
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

/**
 * Convert string to ArrayBuffer for secure storage
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Convert ArrayBuffer back to string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Ephemeral PQC Key Manager Class
 * 
 * Provides secure management of PQC cryptographic keys with automatic cleanup
 * on browser navigation and page unload events.
 */
export class EphemeralPQCKeyManager {
  private keyPair: EphemeralKeyPair | null = null;
  private cleanupExecuted = false;
  private beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private options: Required<EphemeralKeyManagerOptions>;

  constructor(options: EphemeralKeyManagerOptions = {}) {
    this.options = {
      enableBeforeUnloadCleanup: true,
      secureDeletePasses: 3,
      enableLogging: false,
      ...options
    };

    this.setupEventListeners();
  }

  /**
   * Set up browser event listeners for automatic cleanup
   */
  private setupEventListeners(): void {
    if (!this.options.enableBeforeUnloadCleanup || typeof window === 'undefined') {
      return;
    }

    // beforeunload handler for navigation
    this.beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (this.keyPair && !this.cleanupExecuted) {
        if (this.options.enableLogging) {
          console.log('� Browser navigation detected - cleaning up keys...');
        }
        
        this.clearKeys();
        
        // Show warning to user
        event.preventDefault();
        event.returnValue = 'Cryptographic keys are being securely cleared.';
        return 'Cryptographic keys are being securely cleared.';
      }
    };

    // visibility change handler for tab switching
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden' && this.keyPair) {
        if (this.options.enableLogging) {
          console.log('👁️ Page hidden - keys remain in memory (use clearKeys() for manual cleanup)');
        }
        // Note: We don't auto-clear on visibility change as user might switch tabs temporarily
      }
    };

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * Generate new ephemeral key pair
   */
  async generateKeys(algorithm: 'ML-DSA' | 'SLH-DSA' = 'ML-DSA'): Promise<EphemeralKeyPair> {
    // Clear any existing keys first
    if (this.keyPair) {
      this.clearKeys();
    }

    // Reset cleanup flag for new keys
    this.cleanupExecuted = false;

    if (typeof window === 'undefined' || !(window as any).PQCWallet) {
      throw new Error(
        'PQC WASM module not loaded. ' +
        'Please ensure @dytallix/pqc-wasm is initialized.'
      );
    }

    try {
      // Generate keys using WASM module
      const generatedKeyPair = await (window as any).PQCWallet.generateKeypair(algorithm);
      
      // Convert to secure ArrayBuffer storage
      this.keyPair = {
        publicKey: stringToArrayBuffer(generatedKeyPair.publicKey),
        secretKey: stringToArrayBuffer(generatedKeyPair.secretKey),
        address: generatedKeyPair.address,
        algorithm: generatedKeyPair.algorithm
      };

      if (this.options.enableLogging) {
        console.log('🔑 Ephemeral keys generated:', {
          address: this.keyPair.address,
          algorithm: this.keyPair.algorithm
        });
      }

      return this.keyPair;
    } catch (error) {
      console.error('❌ Failed to generate ephemeral keys:', error);
      throw error;
    }
  }

  /**
   * Secure cleanup function that wipes keys from memory
   */
  clearKeys(): void {
    if (this.cleanupExecuted) {
      return; // Already cleaned up
    }

    if (this.options.enableLogging) {
      console.log('🔒 Executing secure key cleanup...');
    }

    if (this.keyPair) {
      try {
        // Securely wipe key material from memory
        secureWipeArrayBuffer(this.keyPair.publicKey, this.options.secureDeletePasses);
        secureWipeArrayBuffer(this.keyPair.secretKey, this.options.secureDeletePasses);
        
        if (this.options.enableLogging) {
          console.log('✅ Keys securely wiped from memory');
        }
      } catch (error) {
        console.error('❌ Error during key cleanup:', error);
      }
    }

    this.keyPair = null;
    this.cleanupExecuted = true;
  }

  /**
   * Sign transaction with ephemeral keys
   */
  async signTransaction(txObj: any): Promise<any> {
    if (!this.keyPair) {
      throw new Error('No ephemeral keys available. Generate keys first.');
    }

    if (typeof window === 'undefined' || !(window as any).PQCWallet) {
      throw new Error('PQC WASM module not loaded.');
    }

    try {
      // Convert ArrayBuffers back to strings for WASM module
      const publicKeyStr = arrayBufferToString(this.keyPair.publicKey);
      const secretKeyStr = arrayBufferToString(this.keyPair.secretKey);

      return await (window as any).PQCWallet.signTransaction(
        txObj,
        secretKeyStr,
        publicKeyStr
      );
    } catch (error) {
      console.error('❌ Failed to sign transaction:', error);
      throw error;
    }
  }

  /**
   * Export keystore with ephemeral keys
   */
  async exportKeystore(password: string): Promise<string> {
    if (!this.keyPair) {
      throw new Error('No ephemeral keys available. Generate keys first.');
    }

    if (typeof window === 'undefined' || !(window as any).PQCWallet) {
      throw new Error('PQC WASM module not loaded.');
    }

    try {
      // Convert ArrayBuffers back to strings for WASM module
      const publicKeyStr = arrayBufferToString(this.keyPair.publicKey);
      const secretKeyStr = arrayBufferToString(this.keyPair.secretKey);

      const keystore = await (window as any).PQCWallet.exportKeystore(
        {
          address: this.keyPair.address,
          secretKey: secretKeyStr,
          publicKey: publicKeyStr,
          algorithm: this.keyPair.algorithm
        },
        password
      );

      return JSON.stringify(keystore);
    } catch (error) {
      console.error('❌ Failed to export keystore:', error);
      throw error;
    }
  }

  /**
   * Get current key pair (read-only)
   */
  getKeyPair(): EphemeralKeyPair | null {
    return this.keyPair;
  }

  /**
   * Check if keys are currently loaded
   */
  hasKeys(): boolean {
    return this.keyPair !== null && !this.cleanupExecuted;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.keyPair?.address || null;
  }

  /**
   * Destroy the key manager and cleanup all resources
   */
  destroy(): void {
    // Clear keys
    this.clearKeys();

    // Remove event listeners
    if (this.beforeUnloadHandler && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    if (this.visibilityChangeHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.options.enableLogging) {
      console.log('�️ EphemeralPQCKeyManager destroyed');
    }
  }
}

/**
 * Factory function for creating an ephemeral key manager
 */
export function createEphemeralKeyManager(
  options: EphemeralKeyManagerOptions = {}
): EphemeralPQCKeyManager {
  return new EphemeralPQCKeyManager(options);
}

// For React applications, here's a simple hook implementation
export function useEphemeralPQCKeys(options: EphemeralKeyManagerOptions = {}) {
  // This is a placeholder for React integration
  // Applications using React should implement this using useState and useEffect
  throw new Error(
    'useEphemeralPQCKeys hook requires React. ' +
    'Use EphemeralPQCKeyManager class directly for vanilla JavaScript applications.'
  );
}

export default EphemeralPQCKeyManager;
