//! Media file model and database queries
//!
//! Defines data structures for media files, including the full row model and
//! frontend-facing response model, as well as CRUD operations on the `media` table.
//!
//! URLs in the response model are dynamically assembled by the `to_response()` method
//! based on the server address.

use serde::{Deserialize, Serialize};

use crate::db::{DbDriver, Driver};
use crate::errors::app_error::{AppError, AppResult};
use crate::types::snowflake_id::SnowflakeId;
use crate::utils::tz::Timestamp;

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Media {
    pub id: SnowflakeId,
    pub user_id: SnowflakeId,
    pub filename: String,
    pub filepath: String,
    pub mimetype: String,
    pub size: i64,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub title: Option<String>,
    pub alt_text: Option<String>,
    pub caption: Option<String>,
    pub description: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

pub async fn create(
    pool: &crate::db::Pool,
    cmd: &crate::commands::CreateMediaCmd,
) -> AppResult<Media> {
    let (id, now) = (
        crate::utils::id::new_snowflake_id(),
        crate::utils::tz::now_utc(),
    );

    mcms_derive::crud_insert!(
        pool,
        "media",
        [
            "id" => id,
            "user_id" => cmd.user_id,
            "filename" => &cmd.filename,
            "filepath" => &cmd.filepath,
            "mimetype" => &cmd.mimetype,
            "size" => cmd.size,
            "width" => cmd.width,
            "height" => cmd.height,
            "created_at" => now
        ]
    )?;

    let media = mcms_derive::crud_find_one!(pool, "media", Media, where: ("id", id))?;

    Ok(media)
}

pub async fn find_all(
    pool: &crate::db::Pool,
    user_id: SnowflakeId,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<Media>, i64)> {
    let result = mcms_derive::crud_query_paged!(
        pool, Media,
        table: "media",
        where: ("user_id", user_id),
        order_by: "created_at DESC",
        page: page,
        page_size: page_size
    );
    Ok(result)
}

pub async fn find_all_admin(
    pool: &crate::db::Pool,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<Media>, i64)> {
    let result = mcms_derive::crud_query_paged!(
        pool, Media,
        table: "media",
        order_by: "created_at DESC",
        page: page,
        page_size: page_size
    );
    Ok(result)
}

pub async fn find_by_id(pool: &crate::db::Pool, id: SnowflakeId) -> AppResult<Option<Media>> {
    Ok(mcms_derive::crud_find!(pool, "media", Media, where: ("id", id))?)
}

#[derive(Debug, Serialize, Clone)]
pub struct MediaStats {
    pub total_files: i64,
    pub total_size: i64,
    pub by_type: Vec<MediaTypeInfo>,
}

#[derive(Debug, Serialize, Clone)]
pub struct MediaTypeInfo {
    pub mimetype: String,
    pub count: i64,
    pub total_size: i64,
}

pub async fn stats(pool: &crate::db::Pool, user_id: SnowflakeId) -> AppResult<MediaStats> {
    let filter = "";

    let total_sql = format!(
        "SELECT COUNT(*), COALESCE(SUM(size), 0) FROM media WHERE user_id = {}{filter}",
        Driver::ph(1)
    );
    let (total_files, total_size) =
        mcms_derive::crud_query!(pool, (i64, i64), &total_sql, [user_id], fetch_one)?;

    let by_type_sql = format!(
        "SELECT mimetype, COUNT(*), COALESCE(SUM(size), 0) FROM media WHERE user_id = {}{filter} GROUP BY mimetype ORDER BY COUNT(*) DESC",
        Driver::ph(1)
    );
    let rows =
        mcms_derive::crud_query!(pool, (String, i64, i64), &by_type_sql, [user_id], fetch_all)?;

    let by_type = rows
        .into_iter()
        .map(|(mimetype, count, total_size)| MediaTypeInfo {
            mimetype,
            count,
            total_size,
        })
        .collect();

    Ok(MediaStats {
        total_files,
        total_size,
        by_type,
    })
}

pub async fn delete(pool: &crate::db::Pool, id: SnowflakeId) -> AppResult<()> {
    let result = mcms_derive::crud_delete!(pool, "media", where: ("id", id))?;
    AppError::expect_affected(&result, "media")
}

pub async fn resolve_id(pool: &crate::db::Pool, media_id: &str) -> AppResult<Option<i64>> {
    let sql = format!(
        "SELECT id FROM media WHERE id = {}",
        crate::db::Driver::ph(1)
    );
    let q = sqlx::query_scalar::<_, i64>(&sql).bind(media_id.parse::<i64>().unwrap_or(0));
    Ok(q.fetch_optional(pool).await?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::media::CreateMediaCmd;
    use crate::types::snowflake_id::SnowflakeId;

    async fn setup_pool() -> crate::db::Pool {
        crate::test_pool!()
    }

    async fn insert_user(pool: &crate::db::Pool) -> i64 {
        let user = crate::models::user::create(
            pool,
            &crate::commands::user::CreateUserCmd {
                username: "mediauser".to_string(),
                registered_via: crate::models::user::RegisteredVia::Email,
                role: None,
            },
        )
        .await
        .unwrap();
        *user.id
    }

    fn make_cmd(user_id: i64, filename: &str) -> CreateMediaCmd {
        CreateMediaCmd {
            user_id: SnowflakeId(user_id),
            filename: filename.to_string(),
            filepath: format!("/uploads/{filename}"),
            mimetype: "image/png".to_string(),
            size: 1024,
            width: Some(100),
            height: Some(100),
        }
    }

    #[tokio::test]
    async fn create_and_find_by_id() {
        let pool = setup_pool().await;
        let uid = insert_user(&pool).await;
        let media = create(&pool, &make_cmd(uid, "photo.png")).await.unwrap();
        let found = find_by_id(&pool, media.id).await.unwrap().unwrap();
        assert_eq!(found.id, media.id);
        assert_eq!(found.filename, "photo.png");
        assert_eq!(found.user_id, SnowflakeId(uid));
    }

    #[tokio::test]
    async fn find_all_paginated() {
        let pool = setup_pool().await;
        let uid = insert_user(&pool).await;
        for i in 0..5 {
            create(&pool, &make_cmd(uid, &format!("file{i}.png")))
                .await
                .unwrap();
        }
        let (items, total) = find_all(&pool, SnowflakeId(uid), 1, 3).await.unwrap();
        assert_eq!(total, 5);
        assert_eq!(items.len(), 3);
    }

    #[tokio::test]
    async fn stats_returns_counts() {
        let pool = setup_pool().await;
        let uid = insert_user(&pool).await;
        for i in 0..3 {
            create(&pool, &make_cmd(uid, &format!("img{i}.png")))
                .await
                .unwrap();
        }
        let s = stats(&pool, SnowflakeId(uid)).await.unwrap();
        assert_eq!(s.total_files, 3);
        assert_eq!(s.total_size, 3 * 1024);
        assert_eq!(s.by_type.len(), 1);
        assert_eq!(s.by_type[0].mimetype, "image/png");
        assert_eq!(s.by_type[0].count, 3);
    }

    #[tokio::test]
    async fn delete_removes_media() {
        let pool = setup_pool().await;
        let uid = insert_user(&pool).await;
        let media = create(&pool, &make_cmd(uid, "gone.png")).await.unwrap();
        delete(&pool, media.id).await.unwrap();
        let found = find_by_id(&pool, media.id).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn find_by_id_not_found() {
        let pool = setup_pool().await;
        let found = find_by_id(&pool, SnowflakeId(99999)).await.unwrap();
        assert!(found.is_none());
    }
}
