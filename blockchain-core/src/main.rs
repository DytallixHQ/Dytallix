use std::sync::Arc;
use log::{info, warn};
use tokio::runtime::Runtime;

mod consensus;
mod crypto;
mod networking;
mod runtime;
mod storage;

use crate::consensus::ConsensusEngine;
use crate::crypto::PQCManager;
use crate::networking::NetworkManager;
use crate::runtime::DytallixRuntime;
use crate::storage::StorageManager;

#[derive(Debug)]
pub struct DytallixNode {
    runtime: Arc<DytallixRuntime>,
    consensus: Arc<ConsensusEngine>,
    network: Arc<NetworkManager>,
    storage: Arc<StorageManager>,
    pqc_manager: Arc<PQCManager>,
}

impl DytallixNode {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        info!("Initializing Dytallix Node...");

        // Initialize PQC manager first
        let pqc_manager = Arc::new(PQCManager::new()?);
        info!("Post-quantum cryptography initialized");

        // Initialize storage
        let storage = Arc::new(StorageManager::new().await?);
        info!("Storage layer initialized");

        // Initialize runtime
        let runtime = Arc::new(DytallixRuntime::new(Arc::clone(&storage))?);
        info!("Runtime initialized");

        // Initialize consensus engine
        let consensus = Arc::new(ConsensusEngine::new(
            Arc::clone(&runtime),
            Arc::clone(&pqc_manager),
        )?);
        info!("Consensus engine initialized");

        // Initialize network manager
        let network = Arc::new(NetworkManager::new(
            Arc::clone(&consensus),
            Arc::clone(&pqc_manager),
        ).await?);
        info!("Network manager initialized");

        Ok(Self {
            runtime,
            consensus,
            network,
            storage,
            pqc_manager,
        })
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Starting Dytallix Node...");

        // Start network layer
        self.network.start().await?;
        
        // Start consensus engine
        self.consensus.start().await?;

        info!("Dytallix Node started successfully");
        Ok(())
    }

    pub async fn stop(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Stopping Dytallix Node...");
        
        self.consensus.stop().await?;
        self.network.stop().await?;
        
        info!("Dytallix Node stopped");
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    
    info!("Welcome to Dytallix - Post-Quantum AI-Enhanced Cryptocurrency");
    
    let node = DytallixNode::new().await?;
    
    // Handle graceful shutdown
    let node_clone = Arc::new(node);
    let shutdown_node = Arc::clone(&node_clone);
    
    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.expect("Failed to listen for Ctrl+C");
        warn!("Received shutdown signal");
        if let Err(e) = shutdown_node.stop().await {
            log::error!("Error during shutdown: {}", e);
        }
        std::process::exit(0);
    });
    
    node_clone.start().await?;
    
    // Keep the main thread alive
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
}
