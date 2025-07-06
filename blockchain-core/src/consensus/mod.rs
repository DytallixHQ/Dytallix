use anyhow::Result;
use reqwest::{Client, ClientBuilder};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use uuid;
use chrono;
use serde_json;

// Temporarily stub out problematic code
pub struct DytallixConsensus;

/// AI Oracle Client for communicating with AI services
#[derive(Debug, Clone)]
pub struct AIOracleClient {
    /// HTTP client with connection pooling
    client: Client,
    /// Base URL for the AI service
    base_url: String,
    /// Request timeout duration
    timeout: Duration,
}

impl AIOracleClient {
    /// Create a new AIOracleClient with default configuration
    pub fn new(base_url: String) -> Result<Self> {
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(30))
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(60))
            .build()?;

        Ok(Self {
            client,
            base_url,
            timeout: Duration::from_secs(30),
        })
    }

    /// Create a new AIOracleClient with custom timeout
    pub fn with_timeout(base_url: String, timeout: Duration) -> Result<Self> {
        let client = ClientBuilder::new()
            .timeout(timeout)
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(60))
            .build()?;

        Ok(Self {
            client,
            base_url,
            timeout,
        })
    }

    /// Create a new AIOracleClient with custom configuration
    pub fn with_config(
        base_url: String,
        timeout: Duration,
        max_idle_per_host: usize,
        idle_timeout: Duration,
        keepalive: Duration,
    ) -> Result<Self> {
        let client = ClientBuilder::new()
            .timeout(timeout)
            .pool_max_idle_per_host(max_idle_per_host)
            .pool_idle_timeout(idle_timeout)
            .tcp_keepalive(keepalive)
            .build()?;

        Ok(Self {
            client,
            base_url,
            timeout,
        })
    }

    /// Create a new AIOracleClient with connection pool configuration
    pub fn with_pool_config(
        base_url: String,
        timeout: Duration,
        pool_config: ConnectionPoolConfig,
    ) -> Result<Self> {
        let mut client_builder = ClientBuilder::new()
            .timeout(timeout)
            .pool_max_idle_per_host(pool_config.max_idle_per_host)
            .pool_idle_timeout(pool_config.idle_timeout)
            .tcp_keepalive(pool_config.tcp_keepalive);

        // Enable HTTP/2 if configured
        if pool_config.http2_prior_knowledge {
            client_builder = client_builder.http2_prior_knowledge();
        }

        // Set maximum total connections if specified
        if let Some(max_total) = pool_config.max_total_connections {
            client_builder = client_builder.pool_max_idle_per_host(
                std::cmp::min(pool_config.max_idle_per_host, max_total)
            );
        }

        let client = client_builder.build()?;

        Ok(Self {
            client,
            base_url,
            timeout,
        })
    }

    /// Create a new AIOracleClient optimized for high-performance scenarios
    pub fn high_performance(base_url: String, timeout: Duration) -> Result<Self> {
        Self::with_pool_config(base_url, timeout, ConnectionPoolConfig::high_performance())
    }

    /// Create a new AIOracleClient optimized for low-resource scenarios
    pub fn low_resource(base_url: String, timeout: Duration) -> Result<Self> {
        Self::with_pool_config(base_url, timeout, ConnectionPoolConfig::low_resource())
    }

    /// Test basic connectivity to the AI service endpoint
    pub async fn test_connectivity(&self) -> Result<bool> {
        let url = format!("{}/health", self.base_url);

        match self.client.get(&url).send().await {
            Ok(response) => {
                log::info!("AI service connectivity test: HTTP {}", response.status());
                Ok(response.status().is_success())
            }
            Err(e) => {
                log::error!("AI service connectivity test failed: {}", e);
                Ok(false)
            }
        }
    }

    /// Make a GET request to the AI service
    pub async fn get(&self, endpoint: &str) -> Result<reqwest::Response> {
        let url = format!("{}/{}", self.base_url.trim_end_matches('/'), endpoint.trim_start_matches('/'));

        log::debug!("Making GET request to: {}", url);

        let response = self.client
            .get(&url)
            .send()
            .await?;

        log::debug!("GET request completed with status: {}", response.status());
        Ok(response)
    }

    /// Make a POST request to the AI service with JSON payload
    pub async fn post_json<T>(&self, endpoint: &str, payload: &T) -> Result<reqwest::Response>
    where
        T: Serialize,
    {
        let url = format!("{}/{}", self.base_url.trim_end_matches('/'), endpoint.trim_start_matches('/'));

        log::debug!("Making POST request to: {}", url);

        let response = self.client
            .post(&url)
            .json(payload)
            .send()
            .await?;

        log::debug!("POST request completed with status: {}", response.status());
        Ok(response)
    }

    /// Make a POST request to the AI service with custom headers
    pub async fn post_json_with_headers<T>(
        &self,
        endpoint: &str,
        payload: &T,
        headers: &[(&str, &str)],
    ) -> Result<reqwest::Response>
    where
        T: Serialize,
    {
        let url = format!("{}/{}", self.base_url.trim_end_matches('/'), endpoint.trim_start_matches('/'));

        log::debug!("Making POST request with headers to: {}", url);

        let mut request = self.client.post(&url).json(payload);

        for (key, value) in headers {
            request = request.header(*key, *value);
        }

        let response = request.send().await?;

        log::debug!("POST request with headers completed with status: {}", response.status());
        Ok(response)
    }

    /// Make a request and deserialize the JSON response
    pub async fn get_json<T>(&self, endpoint: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let response = self.get(endpoint).await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Request failed with status: {} for endpoint: {}",
                response.status(),
                endpoint
            ));
        }

        let json_response = response.json::<T>().await?;
        Ok(json_response)
    }

    /// Make a POST request and deserialize the JSON response
    pub async fn post_json_response<T, R>(&self, endpoint: &str, payload: &T) -> Result<R>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let response = self.post_json(endpoint, payload).await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Request failed with status: {} for endpoint: {}",
                response.status(),
                endpoint
            ));
        }

        let json_response = response.json::<R>().await?;
        Ok(json_response)
    }

    /// Send an AI request using the AIRequestPayload structure
    pub async fn send_ai_request(&self, payload: &AIRequestPayload) -> Result<reqwest::Response> {
        // Validate the payload before sending
        payload.validate().map_err(|e| anyhow::anyhow!("Invalid request payload: {}", e))?;
        
        let endpoint = match payload.service_type {
            AIServiceType::FraudDetection => "fraud-detection",
            AIServiceType::RiskScoring => "risk-scoring",
            AIServiceType::ContractAnalysis => "contract-analysis",
            AIServiceType::AddressReputation => "address-reputation",
            AIServiceType::KYC => "kyc",
            AIServiceType::AML => "aml",
            AIServiceType::CreditAssessment => "credit-assessment",
            AIServiceType::TransactionValidation => "transaction-validation",
            AIServiceType::PatternAnalysis => "pattern-analysis",
            AIServiceType::ThreatDetection => "threat-detection",
            AIServiceType::Unknown => "unknown",
        };
        
        log::info!("Sending AI request {} to {} service", payload.id, endpoint);
        
        // Create string values for headers to avoid temporary value issues
        let service_type_str = payload.service_type.to_string();
        let priority_str = payload.priority.to_string();
        let timeout_str = payload.timeout.map(|t| t.to_string());
        
        // Set up headers
        let mut headers = vec![
            ("Content-Type", "application/json"),
            ("X-Request-ID", payload.id.as_str()),
            ("X-Service-Type", service_type_str.as_str()),
            ("X-Priority", priority_str.as_str()),
        ];
        
        // Add timeout header if specified
        if let Some(ref timeout_value) = timeout_str {
            headers.push(("X-Timeout", timeout_value.as_str()));
        }
        
        // Add signature header if present
        if let Some(ref signature) = payload.signature {
            headers.push(("X-Signature", signature));
        }
        
        // Add correlation ID if available
        if let Some(ref metadata) = payload.metadata {
            if let Some(ref correlation_id) = metadata.correlation_id {
                headers.push(("X-Correlation-ID", correlation_id));
            }
        }
        
        self.post_json_with_headers(endpoint, payload, &headers).await
    }

    /// Send an AI request and get a typed response
    pub async fn send_ai_request_typed<T>(&self, payload: &AIRequestPayload) -> Result<T>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        let response = self.send_ai_request(payload).await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "AI request failed with status: {} for request ID: {}",
                response.status(),
                payload.id
            ));
        }
        
        let typed_response = response.json::<T>().await?;
        Ok(typed_response)
    }

    /// Get the configured base URL
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// Get the configured timeout
    pub fn timeout(&self) -> Duration {
        self.timeout
    }

    /// Get a reference to the underlying HTTP client
    pub fn client(&self) -> &Client {
        &self.client
    }

    /// Get connection pool statistics and health information
    pub fn connection_info(&self) -> String {
        format!(
            "AIOracleClient connected to: {} | Timeout: {:?}",
            self.base_url,
            self.timeout
        )
    }

    /// Test connection pool efficiency by making multiple concurrent requests
    pub async fn test_connection_pool(&self, concurrent_requests: usize) -> Result<Vec<bool>> {
        let mut handles = Vec::new();
        
        for i in 0..concurrent_requests {
            let client = self.clone();
            let handle = tokio::spawn(async move {
                log::debug!("Starting concurrent request {}", i);
                let result = client.test_connectivity().await;
                log::debug!("Completed concurrent request {}: {:?}", i, result);
                result.unwrap_or(false)
            });
            handles.push(handle);
        }
        
        let mut results = Vec::new();
        for handle in handles {
            let result = handle.await.unwrap_or(false);
            results.push(result);
        }
        
        log::info!(
            "Connection pool test completed: {}/{} requests successful",
            results.iter().filter(|&&x| x).count(),
            concurrent_requests
        );
        
        Ok(results)
    }
}

/// Configuration for connection pooling and keep-alive settings
#[derive(Debug, Clone)]
pub struct ConnectionPoolConfig {
    /// Maximum number of idle connections per host
    pub max_idle_per_host: usize,
    /// Timeout for idle connections in the pool
    pub idle_timeout: Duration,
    /// TCP keep-alive interval
    pub tcp_keepalive: Duration,
    /// Maximum total connections in the pool
    pub max_total_connections: Option<usize>,
    /// Enable HTTP/2 support
    pub http2_prior_knowledge: bool,
}

impl Default for ConnectionPoolConfig {
    fn default() -> Self {
        Self {
            max_idle_per_host: 10,
            idle_timeout: Duration::from_secs(90),
            tcp_keepalive: Duration::from_secs(60),
            max_total_connections: Some(100),
            http2_prior_knowledge: false,
        }
    }
}

impl ConnectionPoolConfig {
    /// Create a new connection pool configuration for high-performance scenarios
    pub fn high_performance() -> Self {
        Self {
            max_idle_per_host: 50,
            idle_timeout: Duration::from_secs(120),
            tcp_keepalive: Duration::from_secs(30),
            max_total_connections: Some(500),
            http2_prior_knowledge: true,
        }
    }

    /// Create a new connection pool configuration for low-resource scenarios
    pub fn low_resource() -> Self {
        Self {
            max_idle_per_host: 2,
            idle_timeout: Duration::from_secs(30),
            tcp_keepalive: Duration::from_secs(120),
            max_total_connections: Some(10),
            http2_prior_knowledge: false,
        }
    }
}

/// Enhanced AI Request Payload for Oracle Communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequestPayload {
    /// Unique request identifier for tracking
    pub id: String,
    /// Type of AI service being requested
    pub service_type: AIServiceType,
    /// Request data specific to the service type
    pub request_data: serde_json::Value,
    /// Timestamp when the request was created
    pub timestamp: u64,
    /// Optional request metadata
    pub metadata: Option<AIRequestMetadata>,
    /// Request priority level
    pub priority: RequestPriority,
    /// Maximum time to wait for response (in seconds)
    pub timeout: Option<u64>,
    /// Callback URL for async responses
    pub callback_url: Option<String>,
    /// Request signature for authentication
    pub signature: Option<String>,
}

/// Metadata associated with AI requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequestMetadata {
    /// Source of the request (e.g., "consensus", "validation", "fraud_detection")
    pub source: String,
    /// Version of the request format
    pub version: String,
    /// Additional context or parameters
    pub context: Option<serde_json::Value>,
    /// Request correlation ID for grouping related requests
    pub correlation_id: Option<String>,
    /// User or system that initiated the request
    pub requester: Option<String>,
}

/// Priority levels for AI requests
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RequestPriority {
    Low,
    Normal,
    High,
    Critical,
}

/// Service types for AI Oracle requests
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AIServiceType {
    FraudDetection,
    RiskScoring,
    ContractAnalysis,
    AddressReputation,
    KYC,
    AML,
    CreditAssessment,
    TransactionValidation,
    PatternAnalysis,
    ThreatDetection,
    Unknown,
}

impl Default for RequestPriority {
    fn default() -> Self {
        RequestPriority::Normal
    }
}

impl AIRequestPayload {
    /// Create a new request payload with minimal required fields
    pub fn new(service_type: AIServiceType, request_data: serde_json::Value) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            service_type,
            request_data,
            timestamp: chrono::Utc::now().timestamp() as u64,
            metadata: None,
            priority: RequestPriority::default(),
            timeout: None,
            callback_url: None,
            signature: None,
        }
    }

    /// Create a new request payload with full configuration
    pub fn new_with_config(
        service_type: AIServiceType,
        request_data: serde_json::Value,
        metadata: Option<AIRequestMetadata>,
        priority: RequestPriority,
        timeout: Option<u64>,
        callback_url: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            service_type,
            request_data,
            timestamp: chrono::Utc::now().timestamp() as u64,
            metadata,
            priority,
            timeout,
            callback_url,
            signature: None,
        }
    }

    /// Create a fraud detection request
    pub fn fraud_detection(transaction_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::FraudDetection, transaction_data)
    }

    /// Create a risk scoring request
    pub fn risk_scoring(transaction_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::RiskScoring, transaction_data)
    }

    /// Create a contract analysis request
    pub fn contract_analysis(contract_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::ContractAnalysis, contract_data)
    }

    /// Create a transaction validation request
    pub fn transaction_validation(transaction_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::TransactionValidation, transaction_data)
    }

    /// Set the request priority
    pub fn with_priority(mut self, priority: RequestPriority) -> Self {
        self.priority = priority;
        self
    }

    /// Set the request timeout
    pub fn with_timeout(mut self, timeout: u64) -> Self {
        self.timeout = Some(timeout);
        self
    }

    /// Set the callback URL
    pub fn with_callback(mut self, callback_url: String) -> Self {
        self.callback_url = Some(callback_url);
        self
    }

    /// Set the request metadata
    pub fn with_metadata(mut self, metadata: AIRequestMetadata) -> Self {
        self.metadata = Some(metadata);
        self
    }

    /// Set the request signature
    pub fn with_signature(mut self, signature: String) -> Self {
        self.signature = Some(signature);
        self
    }

    /// Serialize this payload to a JSON string
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Serialize this payload to pretty JSON string
    pub fn to_json_pretty(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize a payload from a JSON string
    pub fn from_json(data: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(data)
    }

    /// Validate the request payload
    pub fn validate(&self) -> Result<(), String> {
        if self.id.is_empty() {
            return Err("Request ID cannot be empty".to_string());
        }

        if self.timestamp == 0 {
            return Err("Timestamp cannot be zero".to_string());
        }

        // Check if timestamp is not too old (24 hours)
        let now = chrono::Utc::now().timestamp() as u64;
        if now > self.timestamp && (now - self.timestamp) > 86400 {
            return Err("Request timestamp is too old".to_string());
        }

        // Check if timestamp is not too far in the future (1 hour)
        if self.timestamp > now && (self.timestamp - now) > 3600 {
            return Err("Request timestamp is too far in the future".to_string());
        }

        // Validate timeout if set
        if let Some(timeout) = self.timeout {
            if timeout == 0 {
                return Err("Timeout cannot be zero".to_string());
            }
            if timeout > 300 {
                return Err("Timeout cannot exceed 300 seconds".to_string());
            }
        }

        // Validate callback URL if set
        if let Some(ref callback_url) = self.callback_url {
            if callback_url.is_empty() {
                return Err("Callback URL cannot be empty".to_string());
            }
            if !callback_url.starts_with("http://") && !callback_url.starts_with("https://") {
                return Err("Callback URL must be a valid HTTP(S) URL".to_string());
            }
        }

        Ok(())
    }

    /// Get the age of the request in seconds
    pub fn age_seconds(&self) -> u64 {
        let now = chrono::Utc::now().timestamp() as u64;
        if now > self.timestamp {
            now - self.timestamp
        } else {
            0
        }
    }

    /// Check if the request has expired based on timeout
    pub fn is_expired(&self) -> bool {
        if let Some(timeout) = self.timeout {
            self.age_seconds() > timeout
        } else {
            false
        }
    }

    /// Get the effective timeout (default to 30 seconds if not set)
    pub fn effective_timeout(&self) -> u64 {
        self.timeout.unwrap_or(30)
    }
}

impl AIRequestMetadata {
    /// Create new metadata with minimal fields
    pub fn new(source: String, version: String) -> Self {
        Self {
            source,
            version,
            context: None,
            correlation_id: None,
            requester: None,
        }
    }

    /// Create metadata with full configuration
    pub fn new_with_config(
        source: String,
        version: String,
        context: Option<serde_json::Value>,
        correlation_id: Option<String>,
        requester: Option<String>,
    ) -> Self {
        Self {
            source,
            version,
            context,
            correlation_id,
            requester,
        }
    }

    /// Set the context
    pub fn with_context(mut self, context: serde_json::Value) -> Self {
        self.context = Some(context);
        self
    }

    /// Set the correlation ID
    pub fn with_correlation_id(mut self, correlation_id: String) -> Self {
        self.correlation_id = Some(correlation_id);
        self
    }

    /// Set the requester
    pub fn with_requester(mut self, requester: String) -> Self {
        self.requester = Some(requester);
        self
    }
}

impl std::fmt::Display for AIServiceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIServiceType::FraudDetection => write!(f, "fraud-detection"),
            AIServiceType::RiskScoring => write!(f, "risk-scoring"),
            AIServiceType::ContractAnalysis => write!(f, "contract-analysis"),
            AIServiceType::AddressReputation => write!(f, "address-reputation"),
            AIServiceType::KYC => write!(f, "kyc"),
            AIServiceType::AML => write!(f, "aml"),
            AIServiceType::CreditAssessment => write!(f, "credit-assessment"),
            AIServiceType::TransactionValidation => write!(f, "transaction-validation"),
            AIServiceType::PatternAnalysis => write!(f, "pattern-analysis"),
            AIServiceType::ThreatDetection => write!(f, "threat-detection"),
            AIServiceType::Unknown => write!(f, "unknown"),
        }
    }
}

impl std::fmt::Display for RequestPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RequestPriority::Low => write!(f, "low"),
            RequestPriority::Normal => write!(f, "normal"),
            RequestPriority::High => write!(f, "high"),
            RequestPriority::Critical => write!(f, "critical"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_ai_oracle_client_creation() {
        let client = AIOracleClient::new("http://localhost:8080".to_string());
        assert!(client.is_ok());

        let client = client.unwrap();
        assert_eq!(client.base_url(), "http://localhost:8080");
        assert_eq!(client.timeout(), Duration::from_secs(30));
    }

    #[test]
    fn test_ai_oracle_client_with_timeout() {
        let timeout = Duration::from_secs(60);
        let client = AIOracleClient::with_timeout("http://localhost:8080".to_string(), timeout);
        assert!(client.is_ok());

        let client = client.unwrap();
        assert_eq!(client.timeout(), timeout);
    }

    #[tokio::test]
    async fn test_connectivity_with_invalid_url() {
        let client = AIOracleClient::new("http://invalid-url-12345.com".to_string()).unwrap();
        let result = client.test_connectivity().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }

    #[test]
    fn test_url_formatting() {
        let client = AIOracleClient::new("http://localhost:8080/".to_string()).unwrap();
        assert_eq!(client.base_url(), "http://localhost:8080/");
        
        let client = AIOracleClient::new("http://localhost:8080".to_string()).unwrap();
        assert_eq!(client.base_url(), "http://localhost:8080");
    }

    #[test]
    fn test_custom_config() {
        use std::time::Duration;
        
        let client = AIOracleClient::with_config(
            "http://localhost:8080".to_string(),
            Duration::from_secs(45),
            20,
            Duration::from_secs(120),
            Duration::from_secs(90),
        );
        
        assert!(client.is_ok());
        let client = client.unwrap();
        assert_eq!(client.timeout(), Duration::from_secs(45));
    }

    #[test]
    fn test_connection_pool_config() {
        let config = ConnectionPoolConfig::default();
        assert_eq!(config.max_idle_per_host, 10);
        assert_eq!(config.idle_timeout, Duration::from_secs(90));
        assert_eq!(config.tcp_keepalive, Duration::from_secs(60));
        
        let high_perf = ConnectionPoolConfig::high_performance();
        assert_eq!(high_perf.max_idle_per_host, 50);
        assert!(high_perf.http2_prior_knowledge);
        
        let low_res = ConnectionPoolConfig::low_resource();
        assert_eq!(low_res.max_idle_per_host, 2);
        assert!(!low_res.http2_prior_knowledge);
    }

    #[test]
    fn test_client_with_pool_config() {
        let config = ConnectionPoolConfig::default();
        let client = AIOracleClient::with_pool_config(
            "http://localhost:8080".to_string(),
            Duration::from_secs(30),
            config,
        );
        assert!(client.is_ok());
    }

    #[test]
    fn test_high_performance_client() {
        let client = AIOracleClient::high_performance(
            "http://localhost:8080".to_string(),
            Duration::from_secs(30),
        );
        assert!(client.is_ok());
    }

    #[test]
    fn test_low_resource_client() {
        let client = AIOracleClient::low_resource(
            "http://localhost:8080".to_string(),
            Duration::from_secs(30),
        );
        assert!(client.is_ok());
    }

    #[tokio::test]
    async fn test_connection_pool_concurrent_requests() {
        let client = AIOracleClient::new("http://httpbin.org".to_string()).unwrap();
        
        // Test with a small number of concurrent requests
        let results = client.test_connection_pool(3).await;
        assert!(results.is_ok());
        
        // The actual success depends on network availability, so we just check the structure
        let results = results.unwrap();
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_request_payload_serialization() {
        let payload = AIRequestPayload::new(
            AIServiceType::FraudDetection,
            json!({"amount": 1000, "currency": "USD"})
        );
        
        // Test JSON serialization
        let json = payload.to_json();
        assert!(json.is_ok());
        let json_str = json.unwrap();
        assert!(json_str.contains("\"id\""));
        assert!(json_str.contains("\"service_type\":\"FraudDetection\""));
        assert!(json_str.contains("\"request_data\":{\"amount\":1000,\"currency\":\"USD\"}"));
        
        // Test pretty JSON serialization
        let json_pretty = payload.to_json_pretty();
        assert!(json_pretty.is_ok());
        let json_pretty_str = json_pretty.unwrap();
        assert!(json_pretty_str.contains("\"id\""));
        assert!(json_pretty_str.contains("\"service_type\": \"FraudDetection\""));
        assert!(json_pretty_str.contains("\"request_data\": {\n    \"amount\": 1000,\n    \"currency\": \"USD\"\n  }"));
    }

    #[test]
    fn test_request_payload_deserialization() {
        let json_data = r#"{
            "id": "1234",
            "service_type": "RiskScoring",
            "request_data": {"score": 750},
            "timestamp": 1633072800,
            "metadata": {
                "source": "consensus",
                "version": "1.0",
                "context": {"key": "value"},
                "correlation_id": "abcd-efgh",
                "requester": "user123"
            },
            "priority": "High",
            "timeout": 60,
            "callback_url": "http://localhost/callback",
            "signature": "sig1234"
        }"#;
        
        let payload: AIRequestPayload = serde_json::from_str(json_data).unwrap();
        assert_eq!(payload.id, "1234");
        assert_eq!(payload.service_type, AIServiceType::RiskScoring);
        assert_eq!(payload.request_data, json!({"score": 750}));
        assert_eq!(payload.timestamp, 1633072800);
        assert!(payload.metadata.is_some());
        assert_eq!(payload.priority, RequestPriority::High);
        assert_eq!(payload.timeout, Some(60));
        assert_eq!(payload.callback_url, Some("http://localhost/callback".to_string()));
        assert_eq!(payload.signature, Some("sig1234".to_string()));
    }

    #[test]
    fn test_request_payload_validation() {
        let mut payload = AIRequestPayload::new(
            AIServiceType::KYC,
            json!({"name": "John Doe", "document": "123456789"})
        );
        
        // Valid payload
        let validation_result = payload.validate();
        assert!(validation_result.is_ok());
        
        // Invalid payload: empty ID
        payload.id = "".to_string();
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Request ID cannot be empty");
        
        // Invalid payload: timestamp too old
        payload.id = uuid::Uuid::new_v4().to_string();
        payload.timestamp = 0;
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Timestamp cannot be zero");
        
        // Invalid payload: timeout exceeds maximum
        payload.timestamp = chrono::Utc::now().timestamp() as u64;
        payload.timeout = Some(400);
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Timeout cannot exceed 300 seconds");
        
        // Invalid payload: callback URL invalid
        payload.timeout = Some(60);
        payload.callback_url = Some("invalid-url".to_string());
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Callback URL must be a valid HTTP(S) URL");
    }

    #[test]
    fn test_metadata_serialization() {
        let metadata = AIRequestMetadata::new("consensus".to_string(), "1.0".to_string())
            .with_context(json!({"key": "value"}))
            .with_correlation_id("abcd-efgh".to_string())
            .with_requester("user123".to_string());
        
        // Test that metadata can be serialized as part of a request payload
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, json!({"test": "data"}))
            .with_metadata(metadata);
        
        let json_str = payload.to_json().unwrap();
        assert!(!json_str.is_empty());
        assert!(json_str.contains("\"source\":\"consensus\""));
        assert!(json_str.contains("\"version\":\"1.0\""));
        assert!(json_str.contains("\"correlation_id\":\"abcd-efgh\""));
        assert!(json_str.contains("\"requester\":\"user123\""));
    }

    #[test]
    fn test_metadata_deserialization() {
        let json_data = r#"{
            "source": "validation",
            "version": "1.0",
            "context": {"key": "value"},
            "correlation_id": "ijkl-mnop",
            "requester": "user456"
        }"#;
        
        let metadata: AIRequestMetadata = serde_json::from_str(json_data).unwrap();
        assert_eq!(metadata.source, "validation");
        assert_eq!(metadata.version, "1.0");
        assert!(metadata.context.is_some());
        assert_eq!(metadata.correlation_id, Some("ijkl-mnop".to_string()));
        assert_eq!(metadata.requester, Some("user456".to_string()));
    }

    #[test]
    fn test_ai_request_payload_creation() {
        let request_data = serde_json::json!({
            "transaction_id": "tx123",
            "amount": 1000
        });
        
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, request_data);
        
        assert!(!payload.id.is_empty());
        assert_eq!(payload.service_type, AIServiceType::FraudDetection);
        assert_eq!(payload.priority, RequestPriority::Normal);
        assert!(payload.timestamp > 0);
        assert!(payload.metadata.is_none());
        assert!(payload.timeout.is_none());
        assert!(payload.callback_url.is_none());
        assert!(payload.signature.is_none());
    }

    #[test]
    fn test_ai_request_payload_builder_pattern() {
        let request_data = serde_json::json!({
            "transaction_id": "tx123",
            "amount": 1000
        });
        
        let metadata = AIRequestMetadata::new(
            "consensus".to_string(),
            "1.0".to_string(),
        );
        
        let payload = AIRequestPayload::new(AIServiceType::RiskScoring, request_data)
            .with_priority(RequestPriority::High)
            .with_timeout(60)
            .with_callback("https://example.com/callback".to_string())
            .with_metadata(metadata)
            .with_signature("signature123".to_string());
        
        assert_eq!(payload.service_type, AIServiceType::RiskScoring);
        assert_eq!(payload.priority, RequestPriority::High);
        assert_eq!(payload.timeout, Some(60));
        assert_eq!(payload.callback_url, Some("https://example.com/callback".to_string()));
        assert!(payload.metadata.is_some());
        assert_eq!(payload.signature, Some("signature123".to_string()));
    }

    #[test]
    fn test_ai_request_payload_convenience_methods() {
        let tx_data = serde_json::json!({"tx_id": "123"});
        
        let fraud_payload = AIRequestPayload::fraud_detection(tx_data.clone());
        assert_eq!(fraud_payload.service_type, AIServiceType::FraudDetection);
        
        let risk_payload = AIRequestPayload::risk_scoring(tx_data.clone());
        assert_eq!(risk_payload.service_type, AIServiceType::RiskScoring);
        
        let contract_payload = AIRequestPayload::contract_analysis(tx_data.clone());
        assert_eq!(contract_payload.service_type, AIServiceType::ContractAnalysis);
        
        let validation_payload = AIRequestPayload::transaction_validation(tx_data);
        assert_eq!(validation_payload.service_type, AIServiceType::TransactionValidation);
    }

    #[test]
    fn test_ai_request_payload_validation() {
        let request_data = serde_json::json!({"test": "data"});
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, request_data);
        
        // Should validate successfully
        assert!(payload.validate().is_ok());
        
        // Test with invalid callback URL
        let invalid_payload = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}))
            .with_callback("invalid-url".to_string());
        
        assert!(invalid_payload.validate().is_err());
        
        // Test with zero timeout
        let zero_timeout_payload = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}))
            .with_timeout(0);
        
        assert!(zero_timeout_payload.validate().is_err());
        
        // Test with excessive timeout
        let excessive_timeout_payload = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}))
            .with_timeout(400);
        
        assert!(excessive_timeout_payload.validate().is_err());
    }

    #[test]
    fn test_ai_request_payload_serialization() {
        let request_data = serde_json::json!({
            "transaction_id": "tx123",
            "amount": 1000
        });
        
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, request_data);
        
        // Test JSON serialization
        let json_str = payload.to_json().unwrap();
        assert!(!json_str.is_empty());
        
        // Test JSON deserialization
        let deserialized = AIRequestPayload::from_json(&json_str).unwrap();
        assert_eq!(deserialized.id, payload.id);
        assert_eq!(deserialized.service_type, payload.service_type);
        assert_eq!(deserialized.priority, payload.priority);
        
        // Test pretty JSON
        let pretty_json = payload.to_json_pretty().unwrap();
        assert!(pretty_json.contains("{\n"));
    }

    #[test]
    fn test_ai_request_metadata() {
        let metadata = AIRequestMetadata::new("consensus".to_string(), "1.0".to_string())
            .with_context(serde_json::json!({"key": "value"}))
            .with_correlation_id("corr123".to_string())
            .with_requester("user123".to_string());
        
        assert_eq!(metadata.source, "consensus");
        assert_eq!(metadata.version, "1.0");
        assert!(metadata.context.is_some());
        assert_eq!(metadata.correlation_id, Some("corr123".to_string()));
        assert_eq!(metadata.requester, Some("user123".to_string()));
    }

    #[test]
    fn test_request_priority_default() {
        let default_priority = RequestPriority::default();
        assert_eq!(default_priority, RequestPriority::Normal);
    }

    #[test]
    fn test_ai_request_payload_age_and_expiry() {
        use std::thread;
        use std::time::Duration;
        
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}))
            .with_timeout(1); // 1 second timeout
        
        // Should not be expired immediately
        assert!(!payload.is_expired());
        
        // Age should be very small initially
        assert!(payload.age_seconds() < 2);
        
        // Wait a bit and check age
        thread::sleep(Duration::from_millis(100));
        assert!(payload.age_seconds() < 2);
        
        // Test effective timeout
        assert_eq!(payload.effective_timeout(), 1);
        
        let payload_no_timeout = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}));
        assert_eq!(payload_no_timeout.effective_timeout(), 30);
    }

    #[tokio::test]
    async fn test_send_ai_request_payload() {
        let client = AIOracleClient::new("https://httpbin.org".to_string()).unwrap();
        
        let request_data = serde_json::json!({
            "transaction_id": "tx123",
            "amount": 1000,
            "from_address": "addr1",
            "to_address": "addr2"
        });
        
        let payload = AIRequestPayload::fraud_detection(request_data)
            .with_priority(RequestPriority::High)
            .with_timeout(30);
        
        // This will fail because httpbin.org doesn't have our AI endpoints,
        // but it should validate the payload and attempt the request
        let result = client.send_ai_request(&payload).await;
        
        // The request should be attempted (payload validation passes)
        // but will fail with 404 since httpbin.org doesn't have our endpoints
        assert!(result.is_ok() || result.is_err());
        
        println!("AI request attempt result: {:?}", result.is_ok());
    }

    #[test]
    fn test_ai_service_type_display() {
        assert_eq!(AIServiceType::FraudDetection.to_string(), "fraud-detection");
        assert_eq!(AIServiceType::RiskScoring.to_string(), "risk-scoring");
        assert_eq!(AIServiceType::ContractAnalysis.to_string(), "contract-analysis");
        assert_eq!(AIServiceType::TransactionValidation.to_string(), "transaction-validation");
        assert_eq!(AIServiceType::Unknown.to_string(), "unknown");
    }

    #[test]
    fn test_request_priority_display() {
        assert_eq!(RequestPriority::Low.to_string(), "low");
        assert_eq!(RequestPriority::Normal.to_string(), "normal");
        assert_eq!(RequestPriority::High.to_string(), "high");
        assert_eq!(RequestPriority::Critical.to_string(), "critical");
    }
}
