/**
 * PQC Wallet class for managing quantum-resistant wallets
 * 
 * This is a simplified wrapper around the WASM PQC module.
 * In production, this should import from @dytallix/pqc-wasm package.
 * 
 * Security Note: This class stores keys in memory as strings. For enhanced
 * security in browser environments, consider using EphemeralPQCKeyManager
 * which provides automatic memory cleanup on navigation.
 */

export type PQCAlgorithm = 'ML-DSA' | 'SLH-DSA';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
  address: string;
  algorithm: PQCAlgorithm;
}

export class PQCWallet {
  public address: string;
  public algorithm: PQCAlgorithm;
  private publicKey: string;
  private secretKey: string;
  private isDestroyed = false;

  constructor(keypair: KeyPair) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;

    // Register cleanup handler for browser environments
    if (typeof window !== 'undefined') {
      this.setupBrowserCleanup();
    }
  }

  /**
   * Set up browser cleanup handlers for key security
   * Note: This provides basic cleanup. For enhanced security, use EphemeralPQCKeyManager
   */
  private setupBrowserCleanup(): void {
    const cleanup = () => {
      if (!this.isDestroyed) {
        this.destroy();
      }
    };

    // Clean up on page unload
    window.addEventListener('beforeunload', cleanup);
    
    // Clean up on visibility change (optional - commented out as it may be too aggressive)
    // document.addEventListener('visibilitychange', () => {
    //   if (document.visibilityState === 'hidden') {
    //     cleanup();
    //   }
    // });
  }

  /**
   * Generate a new PQC wallet
   * 
   * Note: This requires the @dytallix/pqc-wasm package to be installed
   * and properly initialized in the browser or Node.js environment.
   */
  static async generate(algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      const keypair = await (window as any).PQCWallet.generateKeypair(algorithm);
      return new PQCWallet(keypair);
    }

    throw new Error(
      'PQC WASM module not loaded. ' +
      'Please ensure @dytallix/pqc-wasm is installed and initialized. ' +
      'See https://www.dytallix.com/#/docs'
    );
  }

  /**
   * Import wallet from encrypted keystore JSON
   */
  static async fromKeystore(keystoreJson: string, password: string): Promise<PQCWallet> {
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      const keystore = JSON.parse(keystoreJson);
      const keypair = await (window as any).PQCWallet.importKeystore(keystore, password);
      return new PQCWallet(keypair);
    }

    throw new Error(
      'PQC WASM module not loaded. ' +
      'Please ensure @dytallix/pqc-wasm is installed and initialized.'
    );
  }

  /**
   * Import wallet from secret key
   */
  static fromSecretKey(secretKey: string, algorithm: PQCAlgorithm = 'ML-DSA'): PQCWallet {
    // This is a simplified version - in production, derive address from secret key
    throw new Error('fromSecretKey not yet implemented');
  }

  /**
   * Sign a transaction with PQC signature
   */
  /**
   * Sign a transaction with PQC signature
   */
  async signTransaction(txObj: any): Promise<any> {
    this.checkNotDestroyed();
    
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      return await (window as any).PQCWallet.signTransaction(
        txObj,
        this.secretKey,
        this.publicKey
      );
    }

    throw new Error('PQC WASM module not loaded.');
  }

  /**
   * Export wallet as encrypted keystore JSON
   */
  async exportKeystore(password: string): Promise<string> {
    this.checkNotDestroyed();
    
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      const keystore = await (window as any).PQCWallet.exportKeystore(
        {
          address: this.address,
          secretKey: this.secretKey,
          publicKey: this.publicKey,
          algorithm: this.algorithm
        },
        password
      );
      return JSON.stringify(keystore);
    }

    throw new Error('PQC WASM module not loaded.');
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): string {
    this.checkNotDestroyed();
    return this.publicKey;
  }

  /**
   * Truncate address for display (pqc1ml...xyz)
   */
  getTruncatedAddress(): string {
    this.checkNotDestroyed();
    if (this.address.length <= 15) return this.address;
    return `${this.address.slice(0, 8)}...${this.address.slice(-4)}`;
  }

  /**
   * Securely clear wallet keys from memory
   * 
   * Addresses CWE-316: Cleartext Storage of Sensitive Information in Memory
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    try {
      // Overwrite key strings with random data
      if (this.secretKey) {
        this.secretKey = this.generateRandomString(this.secretKey.length);
        this.secretKey = ''; // Final clear
      }

      if (this.publicKey) {
        this.publicKey = this.generateRandomString(this.publicKey.length);
        this.publicKey = ''; // Final clear
      }

      this.isDestroyed = true;
    } catch (error) {
      console.error('Error during wallet cleanup:', error);
    }
  }

  /**
   * Generate random string for secure overwriting
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Check if wallet has been destroyed
   */
  isWalletDestroyed(): boolean {
    return this.isDestroyed;
  }

  /**
   * Ensure wallet is not destroyed before operations
   */
  private checkNotDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('Wallet has been destroyed for security. Create a new wallet instance.');
    }
  }
}
