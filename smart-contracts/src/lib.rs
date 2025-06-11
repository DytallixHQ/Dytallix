pub mod runtime;
pub mod oracle;
pub mod crypto;

use ink_prelude::vec::Vec;
use scale::{Decode, Encode};

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
pub enum ContractError {
    NotAuthorized,
    InvalidState,
    InsufficientFunds,
    AIFraudDetected,
    Timeout,
    InvalidSignature,
    OracleError,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
pub struct AIAnalysisResult {
    pub risk_score: u8,      // 0-100
    pub is_fraudulent: bool,
    pub confidence: u8,      // 0-100
    pub factors: Vec<u8>,    // Encoded risk factors
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
pub struct PQCSignature {
    pub algorithm: u8,       // Algorithm identifier
    pub signature: Vec<u8>,  // Signature bytes
    pub public_key: Vec<u8>, // Signer's public key
}

pub type Result<T> = core::result::Result<T, ContractError>;
