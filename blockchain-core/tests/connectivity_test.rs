use std::time::Duration;
use dytallix_node::consensus::{AIOracleClient, ConnectionPoolConfig};

#[tokio::test]
async fn test_ai_oracle_connectivity() {
    // Test with a known working endpoint
    let client = AIOracleClient::new("https://httpbin.org".to_string()).unwrap();
    
    // Test connectivity
    let result = client.test_connectivity().await;
    assert!(result.is_ok());
    
    // The result might be false if /health doesn't exist, but the method should work
    println!("Connectivity test result: {:?}", result);
}

#[tokio::test]
async fn test_ai_oracle_connectivity_with_timeout() {
    let client = AIOracleClient::with_timeout(
        "https://httpbin.org".to_string(),
        Duration::from_secs(10),
    ).unwrap();
    
    let result = client.test_connectivity().await;
    assert!(result.is_ok());
    
    println!("Connectivity test with timeout result: {:?}", result);
}

#[tokio::test]
async fn test_connection_pool_functionality() {
    let client = AIOracleClient::high_performance(
        "https://httpbin.org".to_string(),
        Duration::from_secs(15),
    ).unwrap();
    
    // Test connection pool with concurrent requests
    let results = client.test_connection_pool(3).await;
    assert!(results.is_ok());
    
    let results = results.unwrap();
    assert_eq!(results.len(), 3);
    
    println!("Connection pool test results: {:?}", results);
}

#[tokio::test]
async fn test_invalid_endpoint_connectivity() {
    let client = AIOracleClient::new("http://non-existent-domain-12345.com".to_string()).unwrap();
    
    let result = client.test_connectivity().await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), false);
    
    println!("Invalid endpoint test: Connection correctly failed");
}

#[test]
fn test_connection_info() {
    let client = AIOracleClient::new("https://ai-service.example.com".to_string()).unwrap();
    
    let info = client.connection_info();
    assert!(info.contains("ai-service.example.com"));
    assert!(info.contains("30s"));
    
    println!("Connection info: {}", info);
}

#[tokio::test]
async fn test_get_request() {
    let client = AIOracleClient::new("https://httpbin.org".to_string()).unwrap();
    
    // Test a simple GET request
    let response = client.get("get").await;
    assert!(response.is_ok());
    
    let response = response.unwrap();
    assert!(response.status().is_success());
    
    println!("GET request test: HTTP {}", response.status());
}
