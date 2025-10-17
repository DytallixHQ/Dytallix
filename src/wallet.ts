/**
 * PQC Wallet class for managing quantum-resistant wallets
 * 
 * This is a simplified wrapper around the WASM PQC module.
 * In production, this should import from @dytallix/pqc-wasm package.
 */

export type PQCAlgorithm = 'dilithium5' | 'ML-DSA' | 'SLH-DSA';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
  address: string;
  algorithm: PQCAlgorithm;
}

/**
 * Initialize PQC WASM module (required once per app)
 * This must be called before using any PQC wallet functionality
 */
export async function initPQC(): Promise<void> {
  // Check if already initialized
  if (typeof globalThis !== 'undefined' && (globalThis as any).PQCInitialized) {
    return;
  }

  // Check if PQC WASM module is available
  if (typeof globalThis !== 'undefined' && (globalThis as any).initPQC) {
    await (globalThis as any).initPQC();
    (globalThis as any).PQCInitialized = true;
    return;
  }

  throw new Error(
    'PQC WASM module not loaded. ' +
    'Please ensure @dytallix/pqc-wasm is installed and initialized. ' +
    'See https://dytallix.com/#/docs'
  );
}

export class PQCWallet {
  public address: string;
  public algorithm: PQCAlgorithm;
  private publicKey: string;
  private secretKey: string;

  constructor(keypair: KeyPair) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  /**
   * Generate a new PQC wallet with quantum-resistant cryptography
   * Note: initPQC() must be called first
   */
  static async generate(algorithm: PQCAlgorithm = 'dilithium5'): Promise<PQCWallet> {
    // Check if PQC WASM module is initialized
    if (typeof globalThis !== 'undefined' && (globalThis as any).PQCWallet) {
      const keypair = await (globalThis as any).PQCWallet.generateKeypair(algorithm);
      return new PQCWallet(keypair);
    }

    throw new Error(
      'PQC WASM module not initialized. ' +
      'Please call initPQC() first before using PQC wallets. ' +
      'See README examples for proper usage.'
    );
  }

  /**
   * Import wallet from encrypted keystore JSON
   * Note: initPQC() must be called first
   */
  static async fromKeystore(keystoreJson: string, password: string): Promise<PQCWallet> {
    // Check if PQC WASM module is initialized
    if (typeof globalThis !== 'undefined' && (globalThis as any).PQCWallet) {
      const keystore = JSON.parse(keystoreJson);
      const keypair = await (globalThis as any).PQCWallet.importKeystore(keystore, password);
      return new PQCWallet(keypair);
    }

    throw new Error(
      'PQC WASM module not initialized. ' +
      'Please call initPQC() first before using PQC wallets.'
    );
  }

  /**
   * Import wallet from keystore (alias for fromKeystore for compatibility)
   */
  static async importKeystore(keystoreJson: string, password: string): Promise<PQCWallet> {
    return this.fromKeystore(keystoreJson, password);
  }

  /**
   * Import wallet from secret key
   */
  static fromSecretKey(secretKey: string, algorithm: PQCAlgorithm = 'dilithium5'): PQCWallet {
    // This is a simplified version - in production, derive address from secret key
    throw new Error('fromSecretKey not yet implemented');
  }

  /**
   * Sign a transaction with PQC signature
   */
  async signTransaction(txObj: any): Promise<any> {
    // Check if PQC WASM module is initialized
    if (typeof globalThis !== 'undefined' && (globalThis as any).PQCWallet) {
      return await (globalThis as any).PQCWallet.signTransaction(
        txObj,
        this.secretKey,
        this.publicKey,
        this.algorithm
      );
    }

    throw new Error('PQC WASM module not initialized. Please call initPQC() first.');
  }

  /**
   * Export wallet as encrypted keystore JSON
   */
  async exportKeystore(password: string): Promise<string> {
    // Check if PQC WASM module is initialized
    if (typeof globalThis !== 'undefined' && (globalThis as any).PQCWallet) {
      const keystore = await (globalThis as any).PQCWallet.exportKeystore(
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

    throw new Error('PQC WASM module not initialized. Please call initPQC() first.');
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Truncate address for display (dyt1ml...xyz)
   */
  getTruncatedAddress(): string {
    if (this.address.length <= 15) return this.address;
    return `${this.address.slice(0, 8)}...${this.address.slice(-4)}`;
  }
}
