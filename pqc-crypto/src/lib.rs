use pqcrypto_dilithium::dilithium5;
use pqcrypto_kyber::kyber1024;
use serde::{Serialize, Deserialize};
use thiserror::Error;
use zeroize::Zeroize;

#[derive(Error, Debug)]
pub enum PQCError {
    #[error("Invalid key format")]
    InvalidKey,
    #[error("Invalid signature format")]
    InvalidSignature,
    #[error("Signature verification failed")]
    VerificationFailed,
    #[error("Unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),
    #[error("Key generation failed")]
    KeyGenerationFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignatureAlgorithm {
    Dilithium5,
    Falcon1024,
    SphincsSha256128s,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KeyExchangeAlgorithm {
    Kyber1024,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize)]
pub struct KeyPair {
    pub public_key: Vec<u8>,
    #[serde(skip)]
    pub secret_key: Vec<u8>,
    pub algorithm: SignatureAlgorithm,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub data: Vec<u8>,
    pub algorithm: SignatureAlgorithm,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize)]
pub struct KeyExchangeKeyPair {
    pub public_key: Vec<u8>,
    #[serde(skip)]
    pub secret_key: Vec<u8>,
    pub algorithm: KeyExchangeAlgorithm,
}

pub struct PQCManager {
    signature_keypair: KeyPair,
    key_exchange_keypair: KeyExchangeKeyPair,
}

impl PQCManager {
    pub fn new() -> Result<Self, PQCError> {
        Self::new_with_algorithms(
            SignatureAlgorithm::Dilithium5,
            KeyExchangeAlgorithm::Kyber1024,
        )
    }
    
    pub fn new_with_algorithms(
        sig_alg: SignatureAlgorithm,
        kex_alg: KeyExchangeAlgorithm,
    ) -> Result<Self, PQCError> {
        let signature_keypair = Self::generate_signature_keypair(&sig_alg)?;
        let key_exchange_keypair = Self::generate_key_exchange_keypair(&kex_alg)?;
        
        Ok(Self {
            signature_keypair,
            key_exchange_keypair,
        })
    }
    
    fn generate_signature_keypair(algorithm: &SignatureAlgorithm) -> Result<KeyPair, PQCError> {
        match algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let (pk, sk) = dilithium5::keypair();
                Ok(KeyPair {
                    public_key: pk.as_bytes().to_vec(),
                    secret_key: sk.as_bytes().to_vec(),
                    algorithm: algorithm.clone(),
                })
            }
            SignatureAlgorithm::Falcon1024 => {
                // Placeholder for Falcon implementation
                Err(PQCError::UnsupportedAlgorithm("Falcon1024".to_string()))
            }
            SignatureAlgorithm::SphincsSha256128s => {
                // Placeholder for SPHINCS+ implementation
                Err(PQCError::UnsupportedAlgorithm("SphincsSha256128s".to_string()))
            }
        }
    }
    
    fn generate_key_exchange_keypair(algorithm: &KeyExchangeAlgorithm) -> Result<KeyExchangeKeyPair, PQCError> {
        match algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let (pk, sk) = kyber1024::keypair();
                Ok(KeyExchangeKeyPair {
                    public_key: pk.as_bytes().to_vec(),
                    secret_key: sk.as_bytes().to_vec(),
                    algorithm: algorithm.clone(),
                })
            }
        }
    }
    
    pub fn sign(&self, message: &[u8]) -> Result<Signature, PQCError> {
        match self.signature_keypair.algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let sk = dilithium5::SecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let signed_message = dilithium5::sign(message, &sk);
                
                Ok(Signature {
                    data: signed_message.as_bytes().to_vec(),
                    algorithm: SignatureAlgorithm::Dilithium5,
                })
            }
            _ => Err(PQCError::UnsupportedAlgorithm(format!("{:?}", self.signature_keypair.algorithm))),
        }
    }
    
    pub fn verify(&self, message: &[u8], signature: &Signature, public_key: &[u8]) -> Result<bool, PQCError> {
        match signature.algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let pk = dilithium5::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let signed_message = dilithium5::SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature)?;
                
                match dilithium5::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            _ => Err(PQCError::UnsupportedAlgorithm(format!("{:?}", signature.algorithm))),
        }
    }
    
    pub fn encapsulate(&self, peer_public_key: &[u8]) -> Result<(Vec<u8>, Vec<u8>), PQCError> {
        match self.key_exchange_keypair.algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let pk = kyber1024::PublicKey::from_bytes(peer_public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let (ciphertext, shared_secret) = kyber1024::encapsulate(&pk);
                
                Ok((ciphertext.as_bytes().to_vec(), shared_secret.as_bytes().to_vec()))
            }
        }
    }
    
    pub fn decapsulate(&self, ciphertext: &[u8]) -> Result<Vec<u8>, PQCError> {
        match self.key_exchange_keypair.algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let sk = kyber1024::SecretKey::from_bytes(&self.key_exchange_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let ct = kyber1024::Ciphertext::from_bytes(ciphertext)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let shared_secret = kyber1024::decapsulate(&ct, &sk);
                
                Ok(shared_secret.as_bytes().to_vec())
            }
        }
    }
    
    pub fn get_signature_public_key(&self) -> &[u8] {
        &self.signature_keypair.public_key
    }
    
    pub fn get_key_exchange_public_key(&self) -> &[u8] {
        &self.key_exchange_keypair.public_key
    }
    
    pub fn get_signature_algorithm(&self) -> &SignatureAlgorithm {
        &self.signature_keypair.algorithm
    }
    
    pub fn get_key_exchange_algorithm(&self) -> &KeyExchangeAlgorithm {
        &self.key_exchange_keypair.algorithm
    }
    
    // Crypto-agility: Switch signature algorithms
    pub fn switch_signature_algorithm(&mut self, algorithm: SignatureAlgorithm) -> Result<(), PQCError> {
        self.signature_keypair = Self::generate_signature_keypair(&algorithm)?;
        log::info!("Switched to signature algorithm: {:?}", algorithm);
        Ok(())
    }
    
    // Crypto-agility: Switch key exchange algorithms
    pub fn switch_key_exchange_algorithm(&mut self, algorithm: KeyExchangeAlgorithm) -> Result<(), PQCError> {
        self.key_exchange_keypair = Self::generate_key_exchange_keypair(&algorithm)?;
        log::info!("Switched to key exchange algorithm: {:?}", algorithm);
        Ok(())
    }
}

impl Drop for PQCManager {
    fn drop(&mut self) {
        // Securely zero out secret keys
        self.signature_keypair.zeroize();
        self.key_exchange_keypair.zeroize();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_signature_generation_and_verification() {
        let pqc = PQCManager::new().unwrap();
        let message = b"Hello, quantum world!";
        
        let signature = pqc.sign(message).unwrap();
        let is_valid = pqc.verify(message, &signature, pqc.get_signature_public_key()).unwrap();
        
        assert!(is_valid);
    }
    
    #[test]
    fn test_key_exchange() {
        let alice = PQCManager::new().unwrap();
        let bob = PQCManager::new().unwrap();
        
        // Alice encapsulates a secret using Bob's public key
        let (ciphertext, alice_shared_secret) = alice.encapsulate(bob.get_key_exchange_public_key()).unwrap();
        
        // Bob decapsulates to get the same secret
        let bob_shared_secret = bob.decapsulate(&ciphertext).unwrap();
        
        assert_eq!(alice_shared_secret, bob_shared_secret);
    }
}
