pub struct Config {
    pub node_url: String,
    pub ai_url: String,
    pub verbose: bool,
}

use std::path::Path;
use anyhow::Result;
use tokio::fs;

pub async fn create_default_config(config_dir: &Path) -> Result<()> {
    let config_content = r#"
[network]
node_url = "http://localhost:8080"
ai_services_url = "http://localhost:8000"

[developer]
default_account = ""
verbose = false

[ai]
auto_analysis = true
fraud_threshold = 0.7
risk_threshold = 0.5
"#;

    let config_file = config_dir.join("config.toml");
    fs::write(config_file, config_content).await?;
    
    Ok(())
}
