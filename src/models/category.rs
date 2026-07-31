//! Category model and database queries
//!
//! Defines data structures for content categories and CRUD operations on the `categories` table.
//! Categories support nesting (via `parent_id`) and custom ordering (via `sort_order`).

use serde::{Deserialize, Serialize};

#[cfg(feature = "export-types")]
use ts_rs::TS;

use crate::errors::app_error::{AppError, AppResult};
use crate::types::snowflake_id::SnowflakeId;
use crate::utils::tz::Timestamp;

#[cfg_attr(feature = "export-types", derive(TS))]
#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Category {
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
    pub parent_id: Option<SnowflakeId>,
    pub sort_order: i64,
    pub created_by: Option<SnowflakeId>,
    pub updated_by: Option<SnowflakeId>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

pub async fn find_all(pool: &crate::db::Pool) -> AppResult<Vec<Category>> {
    mcms_derive::crud_list!(pool, "categories", Category, order_by: "sort_order, name")
        .map_err(Into::into)
}

pub async fn find_paginated(
    pool: &crate::db::Pool,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<Category>, i64)> {
    let result = mcms_derive::crud_query_paged!(
        pool, Category,
        table: "categories",
        order_by: "sort_order, name",
        page: page,
        page_size: page_size
    );
    Ok(result)
}

pub async fn find_by_id(pool: &crate::db::Pool, id: SnowflakeId) -> AppResult<Category> {
    mcms_derive::crud_find_one!(pool, "categories", Category, where: ("id", id)).map_err(Into::into)
}

pub async fn create(
    pool: &crate::db::Pool,
    cmd: &crate::commands::CreateCategoryCmd,
    created_by: Option<i64>,
) -> AppResult<Category> {
    let (id, now) = (
        crate::utils::id::new_snowflake_id(),
        crate::utils::tz::now_utc(),
    );

    mcms_derive::crud_insert!(
        pool,
        "categories",
        [
            "id" => id,
            "name" => &cmd.name,
            "slug" => &cmd.slug,
            "description" => &cmd.description,
            "parent_id" => cmd.parent_id,
            "sort_order" => cmd.sort_order,
            "cover_image" => &cmd.cover_image,
            "meta_title" => &cmd.meta_title,
            "meta_description" => &cmd.meta_description,
            "og_title" => &cmd.og_title,
            "og_description" => &cmd.og_description,
            "og_image" => &cmd.og_image,
            "created_by" => created_by,
            "updated_by" => created_by,
            "created_at" => now,
            "updated_at" => now
        ]
    )?;

    find_by_id(pool, id)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("failed to fetch created category: {e}")))
}

pub async fn update(
    pool: &crate::db::Pool,
    cmd: &crate::commands::UpdateCategoryCmd,
    updated_by: Option<i64>,
) -> AppResult<Category> {
    let cat_id = cmd.id;
    let existing = find_by_id(pool, cat_id).await?;

    let name = cmd.name.as_deref().unwrap_or(&existing.name);
    let slug = cmd.slug.as_deref().unwrap_or(&existing.slug);
    let desc = cmd
        .description
        .as_deref()
        .map(std::string::ToString::to_string)
        .or(existing.description);
    let parent = cmd.parent_id.or(existing.parent_id.map(|v| *v));
    let sort = cmd.sort_order.unwrap_or(existing.sort_order);
    let cover_image = cmd
        .cover_image
        .as_deref()
        .map(std::string::ToString::to_string)
        .or(existing.cover_image);
    let meta_title = cmd
        .meta_title
        .as_deref()
        .map(std::string::ToString::to_string)
        .or(existing.meta_title);
    let meta_description = cmd
        .meta_description
        .as_deref()
        .map(std::string::ToString::to_string)
        .or(existing.meta_description);
    let og_title = cmd
        .og_title
        .as_deref()
        .map(std::string::ToString::to_string)
        .or(existing.og_title);
    let og_description = cmd
        .og_description
        .as_deref()
        .map(std::string::ToString::to_string)
        .or(existing.og_description);
    let og_image = cmd
        .og_image
        .as_deref()
        .map(std::string::ToString::to_string)
        .or(existing.og_image);

    let now = crate::utils::tz::now_utc();
    mcms_derive::crud_update!(pool, "categories",
        bind: ["name" => name, "slug" => slug, "description" => desc, "parent_id" => parent, "sort_order" => sort, "cover_image" => cover_image, "meta_title" => meta_title, "meta_description" => meta_description, "og_title" => og_title, "og_description" => og_description, "og_image" => og_image, "updated_by" => updated_by, "updated_at" => &now],
        where: ("id", cat_id)
    )?;

    find_by_id(pool, cat_id).await
}

pub async fn delete(pool: &crate::db::Pool, id: SnowflakeId) -> AppResult<()> {
    let result = mcms_derive::crud_delete!(pool, "categories", where: ("id", id))?;
    AppError::expect_affected(&result, "category")
}

pub async fn ensure_safe_to_delete(pool: &crate::db::Pool, id: SnowflakeId) -> AppResult<()> {
    let child_sql = format!("SELECT COUNT(*) FROM categories WHERE parent_id = {}", *id);
    let child_count = sqlx::query_scalar::<_, i64>(&child_sql)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Internal(e.into()))?;
    if child_count > 0 {
        return Err(AppError::Conflict("category.has_children".to_string()));
    }

    let post_sql = format!("SELECT COUNT(*) FROM posts WHERE category_id = {}", *id);
    let post_count = sqlx::query_scalar::<_, i64>(&post_sql)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Internal(e.into()))?;
    if post_count > 0 {
        return Err(AppError::Conflict("category.has_posts".to_string()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::category::CreateCategoryCmd;
    use crate::commands::category::UpdateCategoryCmd;

    async fn setup_pool() -> crate::db::Pool {
        crate::test_pool!()
    }

    fn make_cmd(name: &str) -> CreateCategoryCmd {
        CreateCategoryCmd {
            name: name.to_string(),
            slug: name.to_lowercase(),
            description: None,
            parent_id: None,
            sort_order: 0,
            cover_image: None,
            meta_title: None,
            meta_description: None,
            og_title: None,
            og_description: None,
            og_image: None,
        }
    }

    #[tokio::test]
    async fn create_and_find_by_id() {
        let pool = setup_pool().await;
        let cat = create(&pool, &make_cmd("Tech"), None).await.unwrap();
        let found = find_by_id(&pool, cat.id).await.unwrap();
        assert_eq!(found.id, cat.id);
        assert_eq!(found.name, "Tech");
    }

    #[tokio::test]
    async fn find_all_returns_all() {
        let pool = setup_pool().await;
        create(&pool, &make_cmd("A"), None).await.unwrap();
        create(&pool, &make_cmd("B"), None).await.unwrap();
        create(&pool, &make_cmd("C"), None).await.unwrap();
        let all = find_all(&pool).await.unwrap();
        assert_eq!(all.len(), 3);
    }

    #[tokio::test]
    async fn find_paginated() {
        let pool = setup_pool().await;
        for name in ["A", "B", "C", "D", "E"] {
            create(&pool, &make_cmd(name), None).await.unwrap();
        }
        let (items, total) = super::find_paginated(&pool, 1, 3).await.unwrap();
        assert_eq!(total, 5);
        assert_eq!(items.len(), 3);
    }

    #[tokio::test]
    async fn update_changes_name() {
        let pool = setup_pool().await;
        let cat = create(&pool, &make_cmd("Old"), None).await.unwrap();
        let updated = update(
            &pool,
            &UpdateCategoryCmd {
                id: cat.id,
                name: Some("New".to_string()),
                slug: None,
                description: None,
                parent_id: None,
                sort_order: None,
                cover_image: None,
                meta_title: None,
                meta_description: None,
                og_title: None,
                og_description: None,
                og_image: None,
            },
            None,
        )
        .await
        .unwrap();
        assert_eq!(updated.name, "New");
    }

    #[tokio::test]
    async fn delete_removes_category() {
        let pool = setup_pool().await;
        let cat = create(&pool, &make_cmd("Gone"), None).await.unwrap();
        delete(&pool, cat.id).await.unwrap();
        let result = find_by_id(&pool, cat.id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn find_by_id_not_found() {
        let pool = setup_pool().await;
        let result = find_by_id(&pool, SnowflakeId(99999)).await;
        assert!(result.is_err());
    }
}
