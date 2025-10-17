/**
 * PQC Wallet class for managing quantum-resistant wallets
 * 
 * Integrates with pqc-wasm for dilithium5 (ML-DSA) cryptography
 */

import type * as PQC from 'pqc-wasm';
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto';
import sha3 from 'js-sha3';

export type PQCAlgorithm = 'dilithium5' | 'falcon1024' | 'sphincs_sha2_128s_simple';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  address: string;
  algorithm: PQCAlgorithm;
}

// Lazy-loaded WASM module
let pqcModule: typeof PQC | null = null;

/**
 * Initialize the PQC WASM module
 * This must be called before using any PQC wallet functionality
 */
export async function initPQC(wasmBinary?: BufferSource): Promise<void> {
  if (pqcModule) return;
  
  try {
    const module = await import('pqc-wasm');
    
    // Initialize WASM
    if (wasmBinary) {
      // Use provided binary
      await module.default(wasmBinary);
    } else if (typeof window === 'undefined') {
      // Node.js environment - load from file
      try {
        const { readFileSync } = await import('fs');
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        
        // Resolve the WASM file path
        const wasmPath = require.resolve('pqc-wasm/pqc_wasm_bg.wasm');
        const wasm = readFileSync(wasmPath);
        await module.default(wasm);
      } catch (e) {
        // Fallback - let it try default loading
        await module.default();
      }
    } else {
      // Browser environment - let it fetch automatically
      await module.default();
    }
    
    pqcModule = module;
  } catch (error) {
    throw new Error(
      'Failed to load pqc-wasm. ' +
      'Please ensure the package is installed: npm install pqc-wasm'
    );
  }
}

export class PQCWallet {
  public address: string;
  public algorithm: PQCAlgorithm;
  private publicKey: Uint8Array;
  private privateKey: Uint8Array;

  constructor(keypair: KeyPair) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.privateKey = keypair.privateKey;
  }

  /**
   * Generate a new PQC wallet
   * Note: Only dilithium5 (ML-DSA) is currently supported in the WASM module
   */
  static async generate(algorithm: PQCAlgorithm = 'dilithium5'): Promise<PQCWallet> {
    // Auto-initialize if not already done
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    if (algorithm !== 'dilithium5') {
      throw new Error('Only dilithium5 algorithm is currently supported in WASM');
    }

    // Generate keypair using WASM
    const result = pqcModule.generate_keypair();
    const publicKey = result.publicKey;
    const privateKey = result.privateKey;
    
    // Generate address from public key
    const address = pqcModule.public_key_to_address(publicKey);

    return new PQCWallet({
      publicKey,
      privateKey,
      address,
      algorithm: 'dilithium5'
    });
  }

  /**
   * Import wallet from private key bytes
   */
  static async fromPrivateKey(privateKey: Uint8Array, algorithm: PQCAlgorithm = 'dilithium5'): Promise<PQCWallet> {
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    // Derive public key from private key
    const publicKey = pqcModule.derive_public_key(privateKey);
    const address = pqcModule.public_key_to_address(publicKey);

    return new PQCWallet({
      publicKey,
      privateKey,
      address,
      algorithm
    });
  }

  /**
   * Sign a message/transaction
   */
  async sign(message: Uint8Array): Promise<Uint8Array> {
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    return pqcModule.sign(this.privateKey, message);
  }

  /**
   * Sign a transaction object for submission to the blockchain
   */
  async signTransaction(tx: any): Promise<any> {
    // Serialize transaction to canonical JSON with sorted keys
    const txJson = this.canonicalJSON(tx);
    const txBytes = new TextEncoder().encode(txJson);
    
    // Hash the transaction with SHA3-256
    const hashBytes = sha3.sha3_256.create().update(txBytes).arrayBuffer();
    const hash = new Uint8Array(hashBytes);
    
    // Sign the hash
    const signature = await this.sign(hash);
    
    // Return signed transaction with signature, public key, algorithm, and version
    return {
      version: 1,
      tx: tx,
      signature: Buffer.from(signature).toString('base64'),
      public_key: Buffer.from(this.publicKey).toString('base64'),
      address: this.address,
      algorithm: this.algorithm
    };
  }

  /**
   * Create canonical JSON with sorted keys (matches server implementation)
   */
  private canonicalJSON(obj: any): string {
    return JSON.stringify(this.sortObjectKeys(obj));
  }

  /**
   * Recursively sort all object keys to ensure deterministic JSON
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }
    
    return sorted;
  }

  /**
   * Verify a signature
   */
  static async verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    return pqcModule.verify(publicKey, message, signature);
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  /**
   * Get wallet private key (use with caution!)
   */
  getPrivateKey(): Uint8Array {
    return this.privateKey;
  }

  /**
   * Truncate address for display (dyt1...xyz)
   */
  getTruncatedAddress(): string {
    if (this.address.length <= 15) return this.address;
    return `${this.address.slice(0, 8)}...${this.address.slice(-4)}`;
  }

  /**
   * Export wallet as JSON (WARNING: This exports the private key in plaintext!)
   * For production, use proper keystore encryption
   */
  toJSON(): { address: string; publicKey: string; privateKey: string; algorithm: PQCAlgorithm } {
    return {
      address: this.address,
      publicKey: Buffer.from(this.publicKey).toString('base64'),
      privateKey: Buffer.from(this.privateKey).toString('base64'),
      algorithm: this.algorithm
    };
  }

  /**
   * Import wallet from JSON
   */
  static fromJSON(json: { address: string; publicKey: string; privateKey: string; algorithm: PQCAlgorithm }): PQCWallet {
    return new PQCWallet({
      address: json.address,
      publicKey: Buffer.from(json.publicKey, 'base64'),
      privateKey: Buffer.from(json.privateKey, 'base64'),
      algorithm: json.algorithm
    });
  }

  /**
   * Export wallet as encrypted keystore JSON
   * Uses PBKDF2 key derivation and AES-256-GCM encryption
   * 
   * @param password - Password to encrypt the private key
   * @returns JSON string containing encrypted wallet data
   */
  async exportKeystore(password: string): Promise<string> {
    // Generate random salt and IV
    const salt = randomBytes(32);
    const iv = randomBytes(16);
    
    // Derive encryption key using PBKDF2
    const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    // Encrypt private key using AES-256-GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encryptedPrivateKey = Buffer.concat([
      cipher.update(this.privateKey),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    
    // Create keystore object
    const keystore = {
      version: 1,
      address: this.address,
      algorithm: this.algorithm,
      publicKey: Buffer.from(this.publicKey).toString('base64'),
      crypto: {
        cipher: 'aes-256-gcm',
        cipherparams: {
          iv: iv.toString('hex')
        },
        ciphertext: encryptedPrivateKey.toString('hex'),
        authTag: authTag.toString('hex'),
        kdf: 'pbkdf2',
        kdfparams: {
          dklen: 32,
          salt: salt.toString('hex'),
          c: 100000,
          prf: 'hmac-sha256'
        }
      }
    };
    
    return JSON.stringify(keystore, null, 2);
  }

  /**
   * Import wallet from encrypted keystore JSON
   * 
   * @param keystoreJson - JSON string or object containing encrypted wallet data
   * @param password - Password to decrypt the private key
   * @returns Decrypted PQCWallet instance
   */
  static async importKeystore(keystoreJson: string | object, password: string): Promise<PQCWallet> {
    const keystore = typeof keystoreJson === 'string' 
      ? JSON.parse(keystoreJson) 
      : keystoreJson;
    
    if (keystore.version !== 1) {
      throw new Error('Unsupported keystore version');
    }
    
    if (keystore.crypto.cipher !== 'aes-256-gcm') {
      throw new Error('Unsupported cipher');
    }
    
    if (keystore.crypto.kdf !== 'pbkdf2') {
      throw new Error('Unsupported KDF');
    }
    
    // Derive decryption key
    const salt = Buffer.from(keystore.crypto.kdfparams.salt, 'hex');
    const key = pbkdf2Sync(
      password,
      salt,
      keystore.crypto.kdfparams.c,
      keystore.crypto.kdfparams.dklen,
      'sha256'
    );
    
    // Decrypt private key
    const iv = Buffer.from(keystore.crypto.cipherparams.iv, 'hex');
    const encryptedPrivateKey = Buffer.from(keystore.crypto.ciphertext, 'hex');
    const authTag = Buffer.from(keystore.crypto.authTag, 'hex');
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let privateKey: Buffer;
    try {
      privateKey = Buffer.concat([
        decipher.update(encryptedPrivateKey),
        decipher.final()
      ]);
    } catch (error) {
      throw new Error('Failed to decrypt keystore - incorrect password or corrupted data');
    }
    
    const publicKey = Buffer.from(keystore.publicKey, 'base64');
    
    // Map legacy algorithm names to current server-expected names
    let algorithm = keystore.algorithm;
    if (algorithm === 'ML-DSA') {
      algorithm = 'dilithium5';
    }
    
    return new PQCWallet({
      address: keystore.address,
      publicKey,
      privateKey,
      algorithm: algorithm as PQCAlgorithm
    });
  }
}
