//! Proxy module configuration loading.
//!
//! Loads `proxy.toml` and `routes/*.toml`, providing type-safe configuration structs.

use std::net::SocketAddr;
use std::path::PathBuf;

use serde::Deserialize;

/// Proxy global configuration.
#[derive(Debug, Clone, Deserialize)]
pub struct ProxyConfig {
    pub proxy: ProxySection,
}

/// `[proxy]` section.
#[derive(Debug, Clone, Deserialize)]
pub struct ProxySection {
    /// HTTP listen address (default `0.0.0.0:80`).
    #[serde(default = "default_listen_http")]
    pub listen_http: String,
    /// HTTPS listen address (default `0.0.0.0:443`).
    #[serde(default = "default_listen_https")]
    pub listen_https: String,
    /// Certificate storage directory.
    #[serde(default = "default_acme_dir")]
    pub acme_dir: PathBuf,
    /// ACME registration email.
    pub acme_email: Option<String>,
    /// ACME directory URL (default Let's Encrypt production).
    #[serde(default = "default_acme_directory")]
    pub acme_directory: String,
    /// Whether to auto-redirect HTTP to HTTPS.
    #[serde(default = "default_true")]
    pub redirect_http_to_https: bool,
    /// Admin API listen address.
    #[serde(default = "default_admin_listen")]
    pub admin_listen: String,
    /// Admin API secret key.
    #[serde(default = "default_admin_secret")]
    pub admin_secret: String,
    /// Route configuration file directory.
    #[serde(default = "default_routes_dir")]
    pub routes_dir: PathBuf,
    /// Health check interval (seconds).
    #[serde(default = "default_health_check_interval")]
    pub health_check_interval_secs: u64,
    /// Log directory.
    #[serde(default = "default_log_dir")]
    pub log_dir: PathBuf,
}

/// Single route configuration.
///
/// One TOML file per route, placed under `routes_dir`.
#[derive(Debug, Clone, Deserialize)]
pub struct RouteConfig {
    pub route: RouteSection,
}

/// `[route]` section.
#[derive(Debug, Clone, Deserialize)]
pub struct RouteSection {
    /// Route name (unique identifier).
    pub name: String,
    /// Subdomain match (e.g. `user1.api.example.com`).
    pub host: Option<String>,
    /// Path prefix match (e.g. `/user1`).
    pub prefix: Option<String>,
    /// Backend address (`unix:/path/to.sock` or `127.0.0.1:9901`).
    pub backend: String,
    /// Custom TLS certificate path.
    pub tls_cert: Option<PathBuf>,
    /// Custom TLS private key path.
    pub tls_key: Option<PathBuf>,
    /// Backend connection timeout (milliseconds).
    #[serde(default = "default_connect_timeout")]
    pub connect_timeout_ms: u64,
    /// Backend response read timeout (milliseconds).
    #[serde(default = "default_read_timeout")]
    pub read_timeout_ms: u64,
    /// Whether the route is enabled.
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

fn default_listen_http() -> String {
    "0.0.0.0:80".into()
}

fn default_listen_https() -> String {
    "0.0.0.0:443".into()
}

fn default_acme_dir() -> PathBuf {
    PathBuf::from("/var/lib/mcms/acme")
}

fn default_acme_directory() -> String {
    "https://acme-v02.api.letsencrypt.org/directory".into()
}

fn default_admin_listen() -> String {
    "127.0.0.1:9876".into()
}

fn default_admin_secret() -> String {
    "change-me-in-production".into()
}

fn default_routes_dir() -> PathBuf {
    PathBuf::from("/etc/mcms/routes")
}

fn default_health_check_interval() -> u64 {
    30
}

fn default_log_dir() -> PathBuf {
    PathBuf::from("/var/lib/mcms/proxy/logs")
}

fn default_connect_timeout() -> u64 {
    5000
}

fn default_read_timeout() -> u64 {
    30000
}

impl ProxyConfig {
    /// Load configuration from a TOML file.
    pub fn load(path: &std::path::Path) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Self = toml::from_str(&content)?;
        Ok(config)
    }

    /// Parse HTTP listen address.
    pub fn http_addr(&self) -> anyhow::Result<SocketAddr> {
        self.proxy.listen_http.parse().map_err(Into::into)
    }

    /// Parse HTTPS listen address.
    pub fn https_addr(&self) -> anyhow::Result<SocketAddr> {
        self.proxy.listen_https.parse().map_err(Into::into)
    }

    /// Parse admin API listen address.
    pub fn admin_addr(&self) -> anyhow::Result<SocketAddr> {
        self.proxy.admin_listen.parse().map_err(Into::into)
    }
}

impl RouteConfig {
    /// Load route configuration from a TOML file.
    pub fn load(path: &std::path::Path) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Self = toml::from_str(&content)?;
        Ok(config)
    }
}

/// Load all .toml files under routes_dir.
pub fn load_all_routes(dir: &std::path::Path) -> Vec<(PathBuf, RouteConfig)> {
    let mut routes = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return routes;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "toml") {
            match RouteConfig::load(&path) {
                Ok(r) => routes.push((path, r)),
                Err(e) => {
                    tracing::warn!(path = %path.display(), error = %e, "failed to load route config");
                }
            }
        }
    }
    routes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_minimal_proxy_config() {
        let toml_str = r#"
[proxy]
"#;
        let config: ProxyConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(config.proxy.listen_http, "0.0.0.0:80");
        assert_eq!(config.proxy.listen_https, "0.0.0.0:443");
        assert!(config.proxy.redirect_http_to_https);
    }

    #[test]
    fn parse_full_proxy_config() {
        let toml_str = r#"
[proxy]
listen_http = "0.0.0.0:8080"
listen_https = "0.0.0.0:8443"
acme_dir = "/data/acme"
acme_email = "admin@example.com"
admin_listen = "127.0.0.1:9999"
admin_secret = "my-secret"
routes_dir = "/etc/mcms/routes"
health_check_interval_secs = 60
"#;
        let config: ProxyConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(config.proxy.listen_http, "0.0.0.0:8080");
        assert_eq!(
            config.proxy.acme_email.as_deref(),
            Some("admin@example.com")
        );
        assert_eq!(config.proxy.health_check_interval_secs, 60);
    }

    #[test]
    fn parse_route_config() {
        let toml_str = r#"
[route]
name = "user1"
host = "user1.api.example.com"
backend = "unix:/run/mcms/user1.sock"
connect_timeout_ms = 3000
"#;
        let config: RouteConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(config.route.name, "user1");
        assert_eq!(config.route.host.as_deref(), Some("user1.api.example.com"));
        assert_eq!(config.route.backend, "unix:/run/mcms/user1.sock");
        assert_eq!(config.route.connect_timeout_ms, 3000);
        assert!(config.route.enabled);
    }

    #[test]
    fn parse_route_with_prefix() {
        let toml_str = r#"
[route]
name = "user2"
prefix = "/user2"
backend = "127.0.0.1:9902"
"#;
        let config: RouteConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(config.route.prefix.as_deref(), Some("/user2"));
        assert!(config.route.host.is_none());
    }

    #[test]
    fn default_values() {
        let toml_str = r#"
[proxy]
"#;
        let config: ProxyConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(config.proxy.acme_dir, PathBuf::from("/var/lib/mcms/acme"));
        assert_eq!(
            config.proxy.acme_directory,
            "https://acme-v02.api.letsencrypt.org/directory"
        );
        assert_eq!(config.proxy.health_check_interval_secs, 30);
    }
}
