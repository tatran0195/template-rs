//! Tag model and database queries
//!
//! Defines data structures for tags and CRUD operations on the `tags` table.
//! Tags are associated with posts via the `taggings` polymorphic join table in a many-to-many relationship.

use serde::{Deserialize, Serialize};
#[cfg(feature = "export-types")]
use ts_rs::TS;

use crate::errors::app_error::{AppError, AppResult};
use crate::types::snowflake_id::SnowflakeId;
use crate::utils::tz::Timestamp;

#[cfg_attr(feature = "export-types", derive(TS))]
#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Tag {
    pub id: SnowflakeId,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub og_title: Option<String>,
    pub og_description: Option<String>,
    pub og_image: Option<String>,
    pub created_by: Option<SnowflakeId>,
    pub updated_by: Option<SnowflakeId>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

pub async fn find_all(pool: &crate::db::Pool) -> AppResult<Vec<Tag>> {
    let result: Vec<Tag> = mcms_derive::crud_list!(pool, "tags", Tag, order_by: "name")?;
    Ok(result)
}

pub async fn find_paginated(
    pool: &crate::db::Pool,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<Tag>, i64)> {
    let result = mcms_derive::crud_query_paged!(
        pool, Tag,
        table: "tags",
        order_by: "name",
        page: page,
        page_size: page_size
    );
    Ok(result)
}

pub async fn find_by_id(pool: &crate::db::Pool, id: SnowflakeId) -> AppResult<Tag> {
    let result: Tag = mcms_derive::crud_find_one!(pool, "tags", Tag, where: ("id", id))?;
    Ok(result)
}

pub async fn create(
    pool: &crate::db::Pool,
    name: &str,
    slug: &str,
    created_by: Option<i64>,
) -> AppResult<Tag> {
    let (id, now) = (
        crate::utils::id::new_snowflake_id(),
        crate::utils::tz::now_utc(),
    );

    mcms_derive::crud_insert!(
        pool,
        "tags",
        [
            "id" => id,
            "name" => name,
            "slug" => slug,
            "created_by" => created_by,
            "updated_by" => created_by,
            "created_at" => &now,
            "updated_at" => &now
        ]
    )?;

    find_by_id(pool, id).await
}

pub async fn update(
    pool: &crate::db::Pool,
    id: SnowflakeId,
    name: &str,
    slug: &str,
) -> AppResult<Tag> {
    let now = crate::utils::tz::now_utc();
    let result = mcms_derive::crud_update!(pool, "tags",
        bind: ["name" => name, "slug" => slug, "updated_at" => &now],
        where: ("id", id)
    )?;
    AppError::expect_affected(&result, "tag")?;
    find_by_id(pool, id).await
}

pub async fn delete(pool: &crate::db::Pool, id: SnowflakeId) -> AppResult<()> {
    let count = crate::models::tagging::count_by_tag_id(pool, id.0).await?;
    if count > 0 {
        return Err(AppError::Conflict("tag_in_use".into()));
    }
    let result = mcms_derive::crud_delete!(pool, "tags", where: ("id", id))?;
    AppError::expect_affected(&result, "tag")
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_pool() -> crate::db::Pool {
        crate::test_pool!()
    }

    #[tokio::test]
    async fn create_and_find_by_id() {
        let pool = setup_pool().await;
        let tag = create(&pool, "rust", "rust", None).await.unwrap();
        assert_eq!(tag.name, "rust");
        assert_eq!(tag.slug, "rust");

        let found = find_by_id(&pool, tag.id).await.unwrap();
        assert_eq!(found.id, tag.id);
        assert_eq!(found.name, "rust");
    }

    #[tokio::test]
    async fn find_all_returns_all() {
        let pool = setup_pool().await;
        create(&pool, "rust", "rust", None).await.unwrap();
        create(&pool, "axum", "axum", None).await.unwrap();
        create(&pool, "tokio", "tokio", None).await.unwrap();

        let tags = find_all(&pool).await.unwrap();
        assert_eq!(tags.len(), 3);
    }

    #[tokio::test]
    async fn find_paginated() {
        let pool = setup_pool().await;
        create(&pool, "rust", "rust", None).await.unwrap();
        create(&pool, "axum", "axum", None).await.unwrap();
        create(&pool, "tokio", "tokio", None).await.unwrap();
        create(&pool, "serde", "serde", None).await.unwrap();
        create(&pool, "clap", "clap", None).await.unwrap();

        let (items, total) = super::find_paginated(&pool, 1, 3).await.unwrap();
        assert_eq!(total, 5);
        assert_eq!(items.len(), 3);
    }

    #[tokio::test]
    async fn update_changes_name() {
        let pool = setup_pool().await;
        let tag = create(&pool, "rust", "rust", None).await.unwrap();

        let updated = update(&pool, tag.id, "Rust Lang", "rust-lang")
            .await
            .unwrap();
        assert_eq!(updated.name, "Rust Lang");
        assert_eq!(updated.slug, "rust-lang");
        assert_eq!(updated.id, tag.id);
    }

    #[tokio::test]
    async fn delete_removes_tag() {
        let pool = setup_pool().await;
        let tag = create(&pool, "rust", "rust", None).await.unwrap();

        delete(&pool, tag.id).await.unwrap();
        let result = find_by_id(&pool, tag.id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn delete_tag_in_use_rejected() {
        let pool = setup_pool().await;
        let tag = create(&pool, "rust", "rust", None).await.unwrap();

        let id = crate::utils::id::new_snowflake_id();
        mcms_derive::crud_insert!(
            &pool,
            "taggings",
            ["id" => id, "tag_id" => tag.id.0, "taggable_type" => "post", "taggable_id" => 1i64]
        )
        .unwrap();

        let err = delete(&pool, tag.id).await.unwrap_err();
        let msg = err.to_string();
        assert!(msg.contains("tag_in_use"), "got: {msg}");
    }
}
