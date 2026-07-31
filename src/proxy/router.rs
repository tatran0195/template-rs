//! Concurrency-safe routing table.
//!
//! Maintains Host/Prefix → Backend mapping with runtime dynamic add/remove.

use std::net::SocketAddr;
#[cfg(unix)]
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use std::time::Duration;

use dashmap::DashMap;

use crate::proxy::config::RouteSection;

/// Backend address.
#[derive(Debug, Clone)]
pub enum BackendAddr {
    #[cfg(unix)]
    UnixSocket(PathBuf),
    Tcp(SocketAddr),
}

impl std::fmt::Display for BackendAddr {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            #[cfg(unix)]
            Self::UnixSocket(p) => write!(f, "unix:{}", p.display()),
            Self::Tcp(addr) => write!(f, "tcp:{addr}"),
        }
    }
}

/// Backend instance.
#[derive(Debug, Clone)]
pub struct Backend {
    /// Route name.
    pub name: String,
    /// Backend address.
    pub addr: BackendAddr,
    /// Whether the backend is healthy.
    pub healthy: Arc<AtomicBool>,
    /// Connection timeout.
    pub connect_timeout: Duration,
    /// Read timeout.
    pub read_timeout: Duration,
}

/// Concurrency-safe routing table.
pub struct RouterTable {
    /// Host → Backend (exact match).
    by_host: DashMap<String, Arc<Backend>>,
    /// Prefix → Backend (longest prefix match).
    by_prefix: DashMap<String, Arc<Backend>>,
}

impl Default for RouterTable {
    fn default() -> Self {
        Self::new()
    }
}

impl RouterTable {
    /// Create an empty routing table.
    pub fn new() -> Self {
        Self {
            by_host: DashMap::new(),
            by_prefix: DashMap::new(),
        }
    }

    /// Batch load from route configs.
    pub fn load_from_routes(&self, routes: &[RouteSection]) {
        for r in routes {
            if !r.enabled {
                continue;
            }
            let backend = match parse_backend(&r.backend) {
                Ok(b) => b,
                Err(e) => {
                    tracing::warn!(
                        name = %r.name,
                        backend = %r.backend,
                        error = %e,
                        "skipping route with invalid backend"
                    );
                    continue;
                }
            };
            let backend = Arc::new(Backend {
                name: r.name.clone(),
                addr: backend,
                healthy: Arc::new(AtomicBool::new(true)),
                connect_timeout: Duration::from_millis(r.connect_timeout_ms),
                read_timeout: Duration::from_millis(r.read_timeout_ms),
            });

            if let Some(host) = &r.host {
                self.by_host.insert(host.clone(), backend.clone());
                tracing::info!(name = %r.name, host = %host, "registered host route");
            }
            if let Some(prefix) = &r.prefix {
                let key = if prefix.starts_with('/') {
                    prefix.clone()
                } else {
                    format!("/{prefix}")
                };
                self.by_prefix.insert(key.clone(), backend);
                tracing::info!(name = %r.name, prefix = %key, "registered prefix route");
            }
        }
    }

    /// Alias for load_from_routes
    pub fn load_from_tenants(&self, routes: &[RouteSection]) {
        self.load_from_routes(routes);
    }

    /// Find backend by Host.
    pub fn find_by_host(&self, host: &str) -> Option<Arc<Backend>> {
        let host = host.split(':').next().unwrap_or(host);
        self.by_host.get(host).map(|r| r.value().clone())
    }

    /// Find backend by path prefix (longest prefix match).
    pub fn find_by_prefix(&self, path: &str) -> Option<Arc<Backend>> {
        let mut best: Option<Arc<Backend>> = None;
        let mut best_len = 0;
        for entry in self.by_prefix.iter() {
            let prefix = entry.key();
            if path.starts_with(prefix) && prefix.len() > best_len {
                best = Some(entry.value().clone());
                best_len = prefix.len();
            }
        }
        best
    }

    /// Combined lookup: Host first, then Prefix.
    pub fn find(&self, host: &str, path: &str) -> Option<Arc<Backend>> {
        self.find_by_host(host)
            .or_else(|| self.find_by_prefix(path))
    }

    /// Add or update route.
    pub fn upsert(&self, route: &RouteSection) -> anyhow::Result<()> {
        let addr = parse_backend(&route.backend)?;
        let backend = Arc::new(Backend {
            name: route.name.clone(),
            addr,
            healthy: Arc::new(AtomicBool::new(true)),
            connect_timeout: Duration::from_millis(route.connect_timeout_ms),
            read_timeout: Duration::from_millis(route.read_timeout_ms),
        });

        if let Some(host) = &route.host {
            self.by_host.insert(host.clone(), backend.clone());
        }
        if let Some(prefix) = &route.prefix {
            let key = if prefix.starts_with('/') {
                prefix.clone()
            } else {
                format!("/{prefix}")
            };
            self.by_prefix.insert(key, backend);
        }
        Ok(())
    }

    /// Remove route.
    pub fn remove(&self, name: &str) {
        self.by_host.retain(|_, b| b.name != name);
        self.by_prefix.retain(|_, b| b.name != name);
    }

    /// List all backends.
    pub fn all_backends(&self) -> Vec<Arc<Backend>> {
        let mut seen = std::collections::HashSet::new();
        let mut result = Vec::new();
        for entry in self.by_host.iter() {
            if seen.insert(entry.value().name.clone()) {
                result.push(entry.value().clone());
            }
        }
        for entry in self.by_prefix.iter() {
            if seen.insert(entry.value().name.clone()) {
                result.push(entry.value().clone());
            }
        }
        result
    }

    /// Number of route entries.
    pub fn len(&self) -> usize {
        self.by_host.len() + self.by_prefix.len()
    }

    /// Whether the table is empty.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

/// Parse backend address string.
fn parse_backend(s: &str) -> anyhow::Result<BackendAddr> {
    if let Some(_path) = s.strip_prefix("unix:") {
        #[cfg(unix)]
        {
            Ok(BackendAddr::UnixSocket(PathBuf::from(_path)))
        }
        #[cfg(not(unix))]
        {
            anyhow::bail!("Unix sockets are not supported on this platform");
        }
    } else {
        let addr: SocketAddr = s.parse()?;
        Ok(BackendAddr::Tcp(addr))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_route(
        name: &str,
        host: Option<&str>,
        prefix: Option<&str>,
        backend: &str,
    ) -> RouteSection {
        RouteSection {
            name: name.to_string(),
            host: host.map(|s| s.to_string()),
            prefix: prefix.map(|s| s.to_string()),
            backend: backend.to_string(),
            tls_cert: None,
            tls_key: None,
            connect_timeout_ms: 5000,
            read_timeout_ms: 30000,
            enabled: true,
        }
    }

    #[test]
    fn parse_tcp_backend() {
        let addr = parse_backend("127.0.0.1:9901").unwrap();
        assert!(matches!(addr, BackendAddr::Tcp(a) if a.port() == 9901));
    }

    #[test]
    fn route_by_host() {
        let router = RouterTable::new();
        router.load_from_routes(&[
            make_route(
                "user1",
                Some("user1.example.com"),
                None,
                "127.0.0.1:9001",
            ),
            make_route(
                "user2",
                Some("user2.example.com"),
                None,
                "127.0.0.1:9002",
            ),
        ]);

        let b = router.find_by_host("user1.example.com").unwrap();
        assert_eq!(b.name, "user1");
    }
}
