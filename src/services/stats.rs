//! Dashboard statistics service.
//!
//! Provides aggregated statistics for the admin dashboard:
//! - Overview (total counts per entity, content type distribution, recent activity)
//! - Per-content-type statistics (status distribution)
//! - Trend data (daily creation counts over the last N days)

use serde_json::{Value, json};

use crate::db::DbDriver;
use crate::db::Pool;
use crate::errors::app_error::AppError;

/// Dashboard statistics service
pub struct StatsService {
    pool: Pool,
}

impl StatsService {
    /// Create a new statistics service instance
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Overview statistics.
    pub async fn overview(&self) -> Result<Value, AppError> {
        let total_posts = count_table(&self.pool, "posts").await?;
        let total_comments = count_table(&self.pool, "comments").await?;
        let total_users = count_table(&self.pool, "users").await?;
        let total_media = count_table(&self.pool, "media").await?;
        let total_categories = count_table(&self.pool, "categories").await?;
        let total_tags = count_table(&self.pool, "tags").await?;

        let content_by_type = self.count_content_types().await?;
        let posts_by_status = self.count_by_status("posts").await?;
        let comments_by_status = self.count_by_status("comments").await?;
        let recent_activity = self.recent_activity(10).await?;

        Ok(json!({
            "total_posts": total_posts,
            "total_comments": total_comments,
            "total_users": total_users,
            "total_media": total_media,
            "total_categories": total_categories,
            "total_tags": total_tags,
            "posts_by_status": posts_by_status,
            "comments_by_status": comments_by_status,
            "content_by_type": content_by_type,
            "recent_activity": recent_activity,
        }))
    }

    /// Per-content-type statistics (status distribution)
    pub async fn content_stats(&self, table: &str) -> Result<Value, AppError> {
        validate_table_name(table)?;
        let has_status = has_column(&self.pool, table, "status").await;
        let total = count_table(&self.pool, table).await?;

        let mut result = json!({
            "table": table,
            "total": total,
        });

        if has_status {
            let cnt_expr = crate::db::Driver::cast_int("COUNT(*)");
            let sql = format!("SELECT status, {cnt_expr} as cnt FROM {table} GROUP BY status");
            let rows: Vec<(String, i64)> =
                sqlx::query_as::<crate::db::pool::Db, (String, i64)>(&sql)
                    .fetch_all(&self.pool)
                    .await
                    .map_err(|e: sqlx::Error| AppError::Internal(e.into()))?;

            let mut by_status = serde_json::Map::new();
            for (status, count) in rows {
                by_status.insert(status, json!(count));
            }
            if let Some(obj) = result.as_object_mut() {
                obj.insert("by_status".into(), json!(by_status));
            }
        }

        Ok(result)
    }

    /// Trend data (daily creation counts over the last N days)
    pub async fn trends(&self, table: &str, days: i64) -> Result<Value, AppError> {
        validate_table_name(table)?;
        let days = days.clamp(1, 365);
        let has_ts = has_column(&self.pool, table, "created_at").await;

        if !has_ts {
            return Ok(json!({
                "table": table,
                "days": days,
                "data": [],
            }));
        }

        let date_expr = date_trunc_day_expr("created_at");
        let cnt_expr = crate::db::Driver::cast_int("COUNT(*)");
        let ago = crate::db::Driver::ago_expr(days);
        let sql = format!(
            "SELECT {date_expr} as d, {cnt_expr} as cnt FROM {table} \
             WHERE created_at >= {ago} \
             GROUP BY d ORDER BY d"
        );

        let rows: Vec<(String, i64)> = sqlx::query_as::<crate::db::pool::Db, (String, i64)>(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e: sqlx::Error| AppError::Internal(e.into()))?;

        let data: Vec<Value> = rows
            .into_iter()
            .map(|(date, count)| json!({"date": date, "count": count}))
            .collect();

        Ok(json!({
            "table": table,
            "days": days,
            "data": data,
        }))
    }

    /// Count records per content type
    async fn count_content_types(&self) -> Result<serde_json::Map<String, Value>, AppError> {
        let tables = get_content_tables(&self.pool).await?;
        let mut result = serde_json::Map::new();

        for table in &tables {
            let count = count_table(&self.pool, table).await?;
            result.insert(table.clone(), json!(count));
        }

        Ok(result)
    }

    /// Count records grouped by status
    async fn count_by_status(
        &self,
        table: &str,
    ) -> Result<serde_json::Map<String, Value>, AppError> {
        validate_table_name(table)?;
        let has_status = has_column(&self.pool, table, "status").await;
        if !has_status {
            return Ok(serde_json::Map::new());
        }

        let cnt_expr = crate::db::Driver::cast_int("COUNT(*)");
        let sql = format!("SELECT status, {cnt_expr} as cnt FROM {table} GROUP BY status");
        let rows: Vec<(String, i64)> = sqlx::query_as::<crate::db::pool::Db, (String, i64)>(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e: sqlx::Error| AppError::Internal(e.into()))?;

        let mut map = serde_json::Map::new();
        for (status, count) in rows {
            map.insert(status, json!(count));
        }
        Ok(map)
    }

    /// Recent activity (most recently created posts + comments)
    async fn recent_activity(&self, limit: i64) -> Result<Vec<Value>, AppError> {
        mcms_derive::check_schema!("posts", "id", "title", "slug", "created_at");
        mcms_derive::check_schema!("comments", "content", "created_at");

        let mut activities = Vec::new();
        let limit_clause = format!("LIMIT {limit}");

        let post_sql = format!(
            "SELECT p.id, p.title, p.slug, {} FROM posts p \
             ORDER BY p.created_at DESC {limit_clause}",
            crate::db::Driver::cast_ts("p.created_at")
        );

        let posts: Vec<(i64, Option<String>, String, String)> = mcms_derive::crud_query!(
            &self.pool,
            (i64, Option<String>, String, String),
            &post_sql,
            [],
            fetch_all
        )
        .map_err(|e: sqlx::Error| AppError::Internal(e.into()))?;

        for (raw_id, title, slug, at) in posts {
            let encoded_id = crate::types::snowflake_id::encode_id(raw_id);
            activities.push(json!({
                "type": "post.created",
                "id": encoded_id,
                "title": title.unwrap_or_default(),
                "slug": slug,
                "at": at,
            }));
        }

        let comment_sql = format!(
            "SELECT c.content, {} FROM comments c \
             ORDER BY c.created_at DESC {limit_clause}",
            crate::db::Driver::cast_ts("c.created_at")
        );

        let comments: Vec<(Option<String>, String)> = mcms_derive::crud_query!(
            &self.pool,
            (Option<String>, String),
            &comment_sql,
            [],
            fetch_all
        )
        .map_err(|e: sqlx::Error| AppError::Internal(e.into()))?;

        for (content, at) in comments {
            activities.push(json!({
                "type": "comment.created",
                "content": content.unwrap_or_default(),
                "at": at,
            }));
        }

        activities.sort_by(|a, b| {
            let at_a = a["at"].as_str().unwrap_or("");
            let at_b = b["at"].as_str().unwrap_or("");
            at_b.cmp(at_a)
        });
        activities.truncate(limit as usize);

        Ok(activities)
    }
}

/// Count records in a table
async fn count_table(pool: &Pool, table: &str) -> Result<i64, AppError> {
    validate_table_name(table)?;
    let cnt_expr = crate::db::Driver::cast_int("COUNT(*)");
    let sql = format!("SELECT {cnt_expr} FROM {table}");
    let q = sqlx::query_scalar::<crate::db::pool::Db, i64>(&sql);
    let result: i64 = q
        .fetch_one(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Internal(e.into()))?;
    Ok(result)
}

/// Check if a table has a specific column
async fn has_column(pool: &Pool, table: &str, column: &str) -> bool {
    crate::db::Driver::has_column(pool, table, column).await
}

/// Get all content-type-related table names from the database
async fn get_content_tables(pool: &Pool) -> Result<Vec<String>, AppError> {
    let excluded_tables = "'users','refresh_tokens','media','roles','permissions','options','pending_jobs','cron_schedules','cron_execution_log'";
    Ok(crate::db::Driver::list_user_tables(pool, excluded_tables).await)
}

/// Date truncation expression (truncate to day)
fn date_trunc_day_expr(col: &str) -> String {
    crate::db::Driver::date_trunc_day(col)
}

fn validate_table_name(table: &str) -> Result<(), AppError> {
    if !crate::db::driver::is_safe_identifier(table) {
        return Err(AppError::BadRequest(format!("invalid table name: {table}")));
    }
    Ok(())
}
