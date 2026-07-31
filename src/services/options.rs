//! Site options service.
//!
//! Option store backed by an LRU cache (moka).

use std::collections::HashMap;
use std::sync::Arc;

use serde_json::Value;
#[cfg(feature = "export-types")]
use ts_rs::TS;

use crate::errors::app_error::AppError;
use crate::models::options::OptionRow;

const CACHE_MAX_ENTRIES: usize = 10_000;
const CACHE_TTL_SECS: u64 = 600;
const CACHE_IDLE_SECS: u64 = 300;

fn parse_value(value_str: &str) -> Value {
    serde_json::from_str::<Value>(value_str).unwrap_or(Value::String(value_str.to_string()))
}

fn cache_key(option_key: &str) -> String {
    option_key.to_string()
}

#[cfg_attr(feature = "export-types", derive(TS))]
#[derive(Debug, Clone, serde::Serialize)]
pub struct OptionGroup {
    pub option_key: String,
    pub label: String,
    pub options: Vec<OptionEntry>,
}

#[cfg_attr(feature = "export-types", derive(TS))]
#[derive(Debug, Clone, serde::Serialize)]
pub struct OptionEntry {
    pub option_key: String,
    #[cfg_attr(feature = "export-types", ts(type = "unknown"))]
    pub value: Value,
    #[serde(rename = "type")]
    #[cfg_attr(feature = "export-types", ts(rename = "type"))]
    pub type_: String,
    pub label: String,
    pub description: Option<String>,
    #[cfg_attr(feature = "export-types", ts(type = "unknown"))]
    pub validation: Option<Value>,
    pub is_public: bool,
}

impl From<&OptionRow> for OptionEntry {
    fn from(row: &OptionRow) -> Self {
        Self {
            option_key: row.option_key.clone(),
            value: parse_value(&row.value),
            type_: row.type_.to_string(),
            label: row.label.clone(),
            description: row.description.clone(),
            validation: row
                .validation
                .as_ref()
                .and_then(|v| serde_json::from_str::<Value>(v).ok()),
            is_public: row.is_public,
        }
    }
}

pub struct OptionsService {
    cache: moka::sync::Cache<String, OptionEntry>,
    pool: Arc<crate::db::Pool>,
}

impl OptionsService {
    pub async fn new(pool: Arc<crate::db::Pool>) -> Self {
        let cache = moka::sync::Cache::builder()
            .max_capacity(CACHE_MAX_ENTRIES as u64)
            .time_to_idle(std::time::Duration::from_secs(CACHE_IDLE_SECS))
            .time_to_live(std::time::Duration::from_secs(CACHE_TTL_SECS))
            .build();

        let service = Self { cache, pool };
        if let Err(e) = service.load_autoload().await {
            tracing::error!("failed to autoload options: {}", e);
        }
        service
    }

    async fn load_autoload(&self) -> Result<(), AppError> {
        let rows = crate::models::options::find_autoload(&self.pool).await?;
        let mut count = 0usize;
        for row in &rows {
            let entry = OptionEntry::from(row);
            let key = cache_key(&row.option_key);
            self.cache.insert(key, entry);
            count += 1;
        }
        tracing::info!("loaded {count} autoload option(s)");
        Ok(())
    }

    pub async fn get(&self, key: &str) -> Option<Value> {
        let ck = cache_key(key);
        if let Some(entry) = self.cache.get(&ck) {
            return Some(entry.value.clone());
        }
        let row = crate::models::options::find_by_key(&self.pool, key)
            .await
            .ok()
            .flatten()?;
        let entry = OptionEntry::from(&row);
        let value = entry.value.clone();
        self.cache.insert(ck, entry);
        Some(value)
    }

    pub async fn get_entry(&self, key: &str) -> Option<OptionEntry> {
        let ck = cache_key(key);
        if let Some(entry) = self.cache.get(&ck) {
            return Some(entry.clone());
        }
        let row = crate::models::options::find_by_key(&self.pool, key)
            .await
            .ok()
            .flatten()?;
        let entry = OptionEntry::from(&row);
        self.cache.insert(ck, entry.clone());
        Some(entry)
    }

    pub async fn set(&self, key: &str, value: Value) -> Result<(), AppError> {
        let value_str = serde_json::to_string(&value).map_err(|e| AppError::Internal(e.into()))?;
        crate::models::options::upsert_value(&self.pool, key, &value_str).await?;
        let ck = cache_key(key);
        self.cache.invalidate(&ck);
        Ok(())
    }

    pub async fn set_batch(&self, pairs: HashMap<String, Value>) -> Result<(), AppError> {
        for (key, value) in &pairs {
            let value_str =
                serde_json::to_string(value).map_err(|e| AppError::Internal(e.into()))?;
            crate::models::options::upsert_value(&self.pool, key, &value_str).await?;
        }
        for key in pairs.keys() {
            let ck = cache_key(key);
            self.cache.invalidate(&ck);
        }
        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<(), AppError> {
        crate::models::options::delete_by_key(&self.pool, key).await?;
        let ck = cache_key(key);
        self.cache.invalidate(&ck);
        Ok(())
    }

    pub async fn get_grouped(&self) -> Result<Vec<OptionGroup>, AppError> {
        let rows = crate::models::options::find_all(&self.pool).await?;
        let mut group_map: HashMap<String, Vec<OptionEntry>> = HashMap::new();
        let mut group_order: Vec<String> = Vec::new();

        for row in &rows {
            let entry = OptionEntry::from(row);
            if !group_map.contains_key(&row.group_name) {
                group_order.push(row.group_name.clone());
            }
            group_map
                .entry(row.group_name.clone())
                .or_default()
                .push(entry);
        }

        Ok(group_order
            .into_iter()
            .map(|key| OptionGroup {
                label: key.clone(),
                option_key: key.clone(),
                options: group_map.remove(&key).unwrap_or_default(),
            })
            .collect())
    }

    pub async fn get_public(&self) -> HashMap<String, Value> {
        let rows = crate::models::options::find_all(&self.pool)
            .await
            .unwrap_or_default();
        rows.iter()
            .filter(|r| r.is_public)
            .map(|r| (r.option_key.clone(), parse_value(&r.value)))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_key_basic() {
        assert_eq!(cache_key("foo"), "foo");
    }

    #[test]
    fn parse_value_handles_json_string() {
        assert_eq!(
            parse_value(r#""hello""#),
            Value::String("hello".to_string())
        );
    }

    #[test]
    fn parse_value_handles_json_number() {
        assert_eq!(parse_value("42"), Value::Number(42.into()));
    }

    #[test]
    fn parse_value_handles_json_bool() {
        assert_eq!(parse_value("true"), Value::Bool(true));
    }

    #[test]
    fn parse_value_falls_back_to_string() {
        assert_eq!(
            parse_value("plain text"),
            Value::String("plain text".to_string())
        );
    }
}
