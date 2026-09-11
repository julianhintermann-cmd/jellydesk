use serde_json::Value;
use std::time::Duration;
use tokio::sync::RwLock;

#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum SeerrError {
    #[error("Jellyseerr is not configured")]
    NotConfigured,
    #[error("Jellyseerr unreachable: {0}")]
    Unreachable(String),
    #[error("Jellyseerr rejected the session")]
    Unauthorized,
    #[error("Jellyseerr HTTP {status}")]
    Http { status: u16, body: String },
}

pub struct SeerrClient {
    http: reqwest::Client,
    base_url: RwLock<Option<String>>,
}

impl Default for SeerrClient {
    fn default() -> Self {
        Self::new()
    }
}

impl SeerrClient {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .cookie_store(true)
            .timeout(Duration::from_secs(20))
            .build()
            .expect("reqwest client");
        Self { http, base_url: RwLock::new(None) }
    }

    pub async fn set_base_url(&self, url: String) {
        *self.base_url.write().await = Some(url.trim_end_matches('/').to_string());
    }

    async fn base(&self) -> Result<String, SeerrError> {
        self.base_url.read().await.clone().ok_or(SeerrError::NotConfigured)
    }

    pub async fn login(&self, username: &str, password: &str) -> Result<Value, SeerrError> {
        let base = self.base().await?;
        let res = self
            .http
            .post(format!("{base}/api/v1/auth/jellyfin"))
            .json(&serde_json::json!({ "username": username, "password": password }))
            .send()
            .await
            .map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        Self::into_json(res).await
    }

    pub async fn request(
        &self,
        method: &str,
        path: &str,
        query: &[(String, String)],
        body: Option<Value>,
    ) -> Result<Value, SeerrError> {
        let base = self.base().await?;
        let method = reqwest::Method::from_bytes(method.as_bytes())
            .map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        let mut req = self.http.request(method, format!("{base}/api/v1{path}")).query(query);
        if let Some(body) = body {
            req = req.json(&body);
        }
        let res = req.send().await.map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        Self::into_json(res).await
    }

    async fn into_json(res: reqwest::Response) -> Result<Value, SeerrError> {
        let status = res.status();
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(SeerrError::Unauthorized);
        }
        let body = res.text().await.map_err(|e| SeerrError::Unreachable(e.to_string()))?;
        if !status.is_success() {
            return Err(SeerrError::Http { status: status.as_u16(), body });
        }
        if body.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&body).map_err(|e| SeerrError::Http { status: status.as_u16(), body: e.to_string() })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn login_sets_cookie_and_requests_carry_it() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/v1/auth/jellyfin"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({ "id": 1, "displayName": "julian", "permissions": 2 }))
                    .insert_header("set-cookie", "connect.sid=abc; Path=/; HttpOnly"),
            )
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v1/auth/me"))
            .and(header("cookie", "connect.sid=abc"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({ "id": 1 })))
            .mount(&server)
            .await;

        let client = SeerrClient::new();
        client.set_base_url(server.uri()).await;
        let user = client.login("julian", "pw").await.unwrap();
        assert_eq!(user["displayName"], "julian");
        let me = client.request("GET", "/auth/me", &[], None).await.unwrap();
        assert_eq!(me["id"], 1);
    }

    #[tokio::test]
    async fn unauthorized_is_typed() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v1/request"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;
        let client = SeerrClient::new();
        client.set_base_url(server.uri()).await;
        let err = client.request("GET", "/request", &[], None).await.unwrap_err();
        assert!(matches!(err, SeerrError::Unauthorized));
    }

    #[tokio::test]
    async fn not_configured_without_base_url() {
        let client = SeerrClient::new();
        let err = client.request("GET", "/auth/me", &[], None).await.unwrap_err();
        assert!(matches!(err, SeerrError::NotConfigured));
    }
}
