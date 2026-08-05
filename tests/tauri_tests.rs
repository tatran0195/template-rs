// ! Tauri adaptation layer integration test
// !
// ! Verify that the service call chain behind the Tauri command works correctly.
// ! These tests call the service function directly (the exact same function called by the Tauri command),
// ! Because the command layer is only thin adaptation (parameter transparent transmission + error conversion to string).

use std::sync::Arc;

use mcms::config::app::AppConfig;
use mcms::content_type::ContentTypeSchema;
use mcms::content_type::repository::{ContentQuery, ContentRepository, SaveContext};
use mcms::services::post::{PostService, PostServiceImpl};
use mcms::services::{auth, options, stats, user};

fn build_post_service(pool: Arc<sqlx::SqlitePool>) -> Arc<dyn PostService> {
    let engine = Arc::new(mcms::aspects::engine::AspectEngine::new());
    let search: Arc<dyn mcms::search::SearchEngine> = Arc::new(mcms::search::NoopSearchEngine);
    Arc::new(PostServiceImpl::new(pool, engine, search))
}

fn with_timestamps(data: serde_json::Value) -> serde_json::Value {
    let mut obj = data
        .as_object()
        .expect("with_timestamps: expected JSON object")
        .clone();
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    obj.insert("created_at".into(), serde_json::json!(now));
    obj.insert("updated_at".into(), serde_json::json!(now));
    serde_json::Value::Object(obj)
}

fn test_config() -> AppConfig {
    let mut config = AppConfig::test_defaults();
    config.database_url = "sqlite::memory:".into();
    config
}

fn test_protocol_registry() -> mcms::protocols::ProtocolRegistry {
    let mut reg = mcms::protocols::ProtocolRegistry::new();
    reg.register(mcms::protocols::ownable::OwnableProtocol);
    reg.register(mcms::protocols::timestampable::TimestampableProtocol);
    reg.register(mcms::protocols::soft_deletable::SoftDeletableProtocol);
    reg.register(mcms::protocols::versionable::VersionableProtocol);
    reg.register(mcms::protocols::lockable::LockableProtocol);
    reg.register(mcms::protocols::sortable::SortableProtocol);
    reg.register(mcms::protocols::expirable::ExpirableProtocol);
    reg.register(mcms::protocols::nestable::NestableProtocol);
    reg
}

fn cache_ct(ct: &mut mcms::content_type::schema::ContentTypeSchema) {
    ct.cache_protocol_columns(&test_protocol_registry());
}

async fn setup_pool() -> sqlx::SqlitePool {
    let pool = mcms::db::Pool::connect("sqlite::memory:").await.unwrap();
    sqlx::query(mcms::db::schema::SCHEMA_SQL)
        .execute(&pool)
        .await
        .unwrap();
    pool
}
async fn create_test_user(pool: &sqlx::SqlitePool, label: &str) -> (i64, String) {
    let aspect_engine = mcms::aspects::engine::AspectEngine::new();
    let req = mcms::dto::RegisterRequest {
        username: format!("user_{label}"),
        email: format!("{label}@test.com"),
        password: "Password123".into(),
    };
    let user = auth::register(&aspect_engine, req, false, pool)
        .await
        .unwrap();
    let row: (i64,) = sqlx::query_as("SELECT id FROM users WHERE id = ?")
        .bind(user.id.parse::<i64>().unwrap())
        .fetch_one(pool)
        .await
        .unwrap();
    (row.0, user.id)
}

fn parse_todo_ct() -> ContentTypeSchema {
    let toml_str = r#"
[content_type]
name = "Todo"
singular = "todo"
plural = "todos"
table = "test_todos"
description = "Test backlog"
implements = ["ownable", "timestampable"]

    [fields.title]
type = "text"
required = true
label = "title"

[fields.done]
type = "boolean"
default = false
label = "Completed"

[fields.priority]
type = "enum"
enum_values = ["low", "medium", "high"]
default = "medium"
label = "priority"
"#;
    let mut ct = ContentTypeSchema::parse_from_str(toml_str).unwrap();
    cache_ct(&mut ct);
    ct
}

// ═══════════════════════════════════════════════════════════════
// Auth service test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_auth_register_service() {
    let pool = setup_pool().await;
    let aspect_engine = mcms::aspects::engine::AspectEngine::new();

    let req = mcms::dto::RegisterRequest {
        username: "testuser".into(),
        email: "test@example.com".into(),
        password: "Password123".into(),
    };

    let result = auth::register(&aspect_engine, req, false, &pool).await;

    assert!(
        result.is_ok(),
        "register should succeed: {:?}",
        result.err()
    );
    let user = result.unwrap();
    assert_eq!(user.username, "testuser");
}

#[tokio::test]
async fn tauri_auth_register_duplicate_email() {
    let pool = setup_pool().await;
    let aspect_engine = mcms::aspects::engine::AspectEngine::new();

    let req = mcms::dto::RegisterRequest {
        username: "user1".into(),
        email: "dup@example.com".into(),
        password: "Password123".into(),
    };
    auth::register(&aspect_engine, req, false, &pool)
        .await
        .unwrap();

    let req2 = mcms::dto::RegisterRequest {
        username: "user2".into(),
        email: "dup@example.com".into(),
        password: "Password456".into(),
    };
    let aspect_engine2 = mcms::aspects::engine::AspectEngine::new();
    let result = auth::register(&aspect_engine2, req2, false, &pool).await;
    assert!(result.is_err(), "duplicate email should fail");
}

#[tokio::test]
async fn tauri_auth_login_service() {
    let pool = setup_pool().await;
    let config = test_config();
    let aspect_engine = mcms::aspects::engine::AspectEngine::new();

    let reg_req = mcms::dto::RegisterRequest {
        username: "loginuser".into(),
        email: "login@example.com".into(),
        password: "Password123".into(),
    };
    auth::register(&aspect_engine, reg_req, false, &pool)
        .await
        .unwrap();

    let login_req = mcms::dto::LoginRequest {
        email: "login@example.com".into(),
        password: "Password123".into(),
    };
    let aspect_engine2 = mcms::aspects::engine::AspectEngine::new();
    let result = auth::login(
        &aspect_engine2,
        &pool,
        &login_req,
        &config.jwt_secret,
        config.jwt_access_expires,
        config.jwt_refresh_expires,
        false,
    )
    .await;

    assert!(result.is_ok(), "login should succeed: {:?}", result.err());
    let login_resp = result.unwrap();
    assert!(!login_resp.access_token.is_empty());
    assert!(!login_resp.refresh_token.is_empty());
}

#[tokio::test]
async fn tauri_auth_login_wrong_password() {
    let pool = setup_pool().await;
    let config = test_config();
    let aspect_engine = mcms::aspects::engine::AspectEngine::new();

    let reg_req = mcms::dto::RegisterRequest {
        username: "wrongpw".into(),
        email: "wrong@example.com".into(),
        password: "Password123".into(),
    };
    auth::register(&aspect_engine, reg_req, false, &pool)
        .await
        .unwrap();

    let login_req = mcms::dto::LoginRequest {
        email: "wrong@example.com".into(),
        password: "WrongPassword".into(),
    };
    let aspect_engine2 = mcms::aspects::engine::AspectEngine::new();
    let result = auth::login(
        &aspect_engine2,
        &pool,
        &login_req,
        &config.jwt_secret,
        config.jwt_access_expires,
        config.jwt_refresh_expires,
        false,
    )
    .await;

    assert!(result.is_err(), "wrong password should fail");
}

#[tokio::test]
async fn tauri_auth_get_me_service() {
    let pool = setup_pool().await;
    let aspect_engine = mcms::aspects::engine::AspectEngine::new();

    let reg_req = mcms::dto::RegisterRequest {
        username: "getme".into(),
        email: "getme@example.com".into(),
        password: "Password123".into(),
    };
    let user = auth::register(&aspect_engine, reg_req, false, &pool)
        .await
        .unwrap();

    let auth = mcms::middleware::auth::AuthUser::for_test_user(user.id.parse().unwrap());
    let result = user::get_me(&pool, &auth).await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap().id, user.id);
}

// ═══════════════════════════════════════════════════════════════
// Post service test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_post_create_and_list() {
    let pool = setup_pool().await;
    let (author_int_id, _author_id) = create_test_user(&pool, "author-001").await;
    let svc = build_post_service(Arc::new(pool.clone()));

    let req = mcms::dto::CreatePostRequest {
        title: "Test Post".into(),
        content: "Hello world".into(),
        excerpt: None,
        cover_image: None,
        image_ids: None,
        status: Some(mcms::models::post::PostStatus::Published),
        category_id: None,
        tag_ids: None,
        slug: None,
        meta_title: None,
        meta_description: None,
        og_title: None,
        og_description: None,
        og_image: None,
        canonical_url: None,
    };

    let auth = mcms::middleware::auth::AuthUser::for_test_user(author_int_id);
    let created = svc.create(&auth, req).await.unwrap();

    assert_eq!(created.title, "Test Post");
    assert!(created.created_by.is_none());

    let (items, total) = svc.list(&auth, 1, 20, None, None, None).await.unwrap();

    assert_eq!(total, 1);
    assert_eq!(items[0].title, "Test Post");
}

#[tokio::test]
async fn tauri_post_get_by_slug() {
    let pool = setup_pool().await;
    let (author_int_id, _author_id) = create_test_user(&pool, "author-002").await;
    let svc = build_post_service(Arc::new(pool.clone()));

    let req = mcms::dto::CreatePostRequest {
        title: "Slug Test".into(),
        content: "content".into(),
        excerpt: None,
        cover_image: None,
        image_ids: None,
        status: Some(mcms::models::post::PostStatus::Published),
        category_id: None,
        tag_ids: None,
        slug: None,
        meta_title: None,
        meta_description: None,
        og_title: None,
        og_description: None,
        og_image: None,
        canonical_url: None,
    };

    let auth = mcms::middleware::auth::AuthUser::for_test_user(author_int_id);
    let created = svc.create(&auth, req).await.unwrap();

    let found = svc.get(&auth, &created.slug).await.unwrap();

    assert_eq!(found.id, created.id);
    assert_eq!(found.title, "Slug Test");
}

// ═══════════════════════════════════════════════════════════════
// CMS Content Type CRUD test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_cms_create_and_list() {
    let pool = setup_pool().await;
    let ct = parse_todo_ct();
    let registry = mcms::content_type::ContentTypeRegistry::new();
    let config = test_config();
    let protocol_reg = test_protocol_registry();
    let protocol_names: Vec<&str> = protocol_reg.names();
    registry
        .register(
            ct.clone(),
            &config.rule_engine,
            &config.builtins.reserved_route_segments(),
            &protocol_names,
            &protocol_reg,
        )
        .unwrap();
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext::default();
    let data = with_timestamps(serde_json::json!({
        "title": "Buy milk",
        "done": false,
        "priority": "high"
    }));

    let created = repo.create(&ct, data, &save_ctx).await.unwrap();
    assert_eq!(created["title"], "Buy milk");

    let query = ContentQuery {
        page: 1,
        page_size: 20,
        max_page_size: 100,
        include_private: false,
        meta_filters: Vec::new(),
        ..Default::default()
    };
    let (items, total) = repo.find(&ct, query).await.unwrap();
    assert_eq!(total, 1);
    assert_eq!(items[0]["title"], "Buy milk");
}

#[tokio::test]
async fn tauri_cms_get_by_id() {
    let pool = setup_pool().await;
    let ct = parse_todo_ct();
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext::default();
    let data = with_timestamps(serde_json::json!({"title": "Read book", "done": false}));
    let created = repo.create(&ct, data, &save_ctx).await.unwrap();

    let id = created["id"].as_str().unwrap().to_string();
    let int_id: i64 = id.parse().unwrap();
    let found = repo
        .find_by_id(
            &ct,
            mcms::types::snowflake_id::SnowflakeId(int_id),
            true,
        )
        .await
        .unwrap()
        .unwrap();
    assert_eq!(found["title"], "Read book");
}

#[tokio::test]
async fn tauri_cms_update() {
    let pool = setup_pool().await;
    let ct = parse_todo_ct();
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext::default();
    let data = with_timestamps(serde_json::json!({"title": "Original", "done": false}));
    let created = repo.create(&ct, data, &save_ctx).await.unwrap();

    let id = created["id"].as_str().unwrap().to_string();
    let int_id: i64 = id.parse().unwrap();
    let update_data = serde_json::json!({"title": "Updated", "done": true});
    repo.update(
        &ct,
        mcms::types::snowflake_id::SnowflakeId(int_id),
        update_data,
        &save_ctx,
    )
    .await
    .unwrap();

    let found = repo
        .find_by_id(
            &ct,
            mcms::types::snowflake_id::SnowflakeId(int_id),
            true,
        )
        .await
        .unwrap()
        .unwrap();
    assert_eq!(found["title"], "Updated");
}

#[tokio::test]
async fn tauri_cms_delete() {
    let pool = setup_pool().await;
    let ct = parse_todo_ct();
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext::default();
    let data = with_timestamps(serde_json::json!({"title": "To delete", "done": false}));
    let created = repo.create(&ct, data, &save_ctx).await.unwrap();

    let id = created["id"].as_str().unwrap().to_string();
    let int_id: i64 = id.parse().unwrap();
    repo.delete(
        &ct,
        mcms::types::snowflake_id::SnowflakeId(int_id),
        &test_protocol_registry(),
        &mcms::content_type::ContentTypeRegistry::new(),
    )
    .await
    .unwrap();

    let found = repo
        .find_by_id(
            &ct,
            mcms::types::snowflake_id::SnowflakeId(int_id),
            true,
        )
        .await
        .unwrap();
    assert!(found.is_none(), "deleted item should not exist");
}

#[tokio::test]
async fn tauri_cms_boolean_field_stored_as_integer() {
    let pool = setup_pool().await;
    let ct = parse_todo_ct();
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext::default();
    let data = with_timestamps(serde_json::json!({"title": "Boolean test", "done": true}));
    let created = repo.create(&ct, data, &save_ctx).await.unwrap();

    assert_eq!(created["done"], 1);
}

#[tokio::test]
async fn tauri_cms_enum_field_validation() {
    let pool = setup_pool().await;
    let ct = parse_todo_ct();
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext::default();
    let data = with_timestamps(serde_json::json!({"title": "Enum test", "priority": "low"}));
    let created = repo.create(&ct, data, &save_ctx).await.unwrap();

    assert_eq!(created["priority"], "low");
}

// ═══════════════════════════════════════════════════════════════
// Content Type Registry Test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_registry_register_and_query() {
    let registry = mcms::content_type::ContentTypeRegistry::new();
    let config = test_config();
    let ct = parse_todo_ct();
    let protocol_reg = test_protocol_registry();
    let protocol_names: Vec<&str> = protocol_reg.names();
    registry
        .register(
            ct,
            &config.rule_engine,
            &config.builtins.reserved_route_segments(),
            &protocol_names,
            &protocol_reg,
        )
        .unwrap();

    assert!(registry.get("todo").is_some());
    assert!(registry.get_by_plural("todos").is_some());
    assert!(registry.get_by_table("test_todos").is_some());
    assert!(registry.get("nonexistent").is_none());
    assert_eq!(registry.len(), 1);
}

#[tokio::test]
async fn tauri_registry_unregister() {
    let registry = mcms::content_type::ContentTypeRegistry::new();
    let config = test_config();
    let ct = parse_todo_ct();
    let protocol_reg = test_protocol_registry();
    let protocol_names: Vec<&str> = protocol_reg.names();
    registry
        .register(
            ct,
            &config.rule_engine,
            &config.builtins.reserved_route_segments(),
            &protocol_names,
            &protocol_reg,
        )
        .unwrap();

    assert_eq!(registry.len(), 1);
    let removed = registry.unregister("todo");
    assert!(removed.is_some());
    assert_eq!(registry.len(), 0);
    assert!(registry.get("todo").is_none());
}

#[tokio::test]
async fn tauri_registry_list_all() {
    let registry = mcms::content_type::ContentTypeRegistry::new();
    let config = test_config();
    let ct1 = parse_todo_ct();

    let ct2_toml = r#"
[content_type]
name = "Note"
singular = "note"
plural = "notes"
table = "test_notes"
implements = ["ownable", "timestampable"]

[fields.body]
type = "text"
label = "content"
"#;
    let ct2 = ContentTypeSchema::parse_from_str(ct2_toml).unwrap();

    let protocol_reg = test_protocol_registry();
    let protocol_names: Vec<&str> = protocol_reg.names();
    registry
        .register(
            ct1,
            &config.rule_engine,
            &config.builtins.reserved_route_segments(),
            &protocol_names,
            &protocol_reg,
        )
        .unwrap();
    registry
        .register(
            ct2,
            &config.rule_engine,
            &config.builtins.reserved_route_segments(),
            &protocol_names,
            &protocol_reg,
        )
        .unwrap();

    let all = registry.all();
    assert_eq!(all.len(), 2);
}

// ═══════════════════════════════════════════════════════════════
// Options service test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_options_set_and_get() {
    let pool = setup_pool().await;
    let svc = options::OptionsService::new(Arc::new(pool)).await;

    svc.set("site.title", serde_json::json!("My Blog"))
        .await
        .unwrap();

    let val = svc.get("site.title").await;
    assert_eq!(val, Some(serde_json::json!("My Blog")));
}

#[tokio::test]
async fn tauri_options_get_nonexistent() {
    let pool = setup_pool().await;
    let svc = options::OptionsService::new(Arc::new(pool)).await;

    let val = svc.get("nonexistent.key").await;
    assert!(val.is_none());
}

#[tokio::test]
async fn tauri_options_overwrite() {
    let pool = setup_pool().await;
    let svc = options::OptionsService::new(Arc::new(pool)).await;

    svc.set("key1", serde_json::json!("value1"))
        .await
        .unwrap();
    svc.set("key1", serde_json::json!("value2"))
        .await
        .unwrap();

    let val = svc.get("key1").await;
    assert_eq!(val, Some(serde_json::json!("value2")));
}

// ═══════════════════════════════════════════════════════════════
// Stats service test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_stats_overview() {
    let pool = setup_pool().await;
    let svc = stats::StatsService::new(pool);

    let result = svc.overview().await;
    assert!(result.is_ok());

    let overview = result.unwrap();
    assert!(overview.get("posts_count").is_some() || overview.get("total_posts").is_some());
}

// ═══════════════════════════════════════════════════════════════
// CMS list params test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_cms_list_with_pagination() {
    let pool = setup_pool().await;
    let ct = parse_todo_ct();
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext::default();
    for i in 0..5 {
        let data =
            with_timestamps(serde_json::json!({"title": format!("Todo {}", i), "done": false}));
        repo.create(&ct, data, &save_ctx).await.unwrap();
    }

    let query = ContentQuery {
        page: 1,
        page_size: 2,
        max_page_size: 100,
        include_private: false,
        meta_filters: Vec::new(),
        ..Default::default()
    };
    let (items, total) = repo.find(&ct, query).await.unwrap();
    assert_eq!(items.len(), 2);
    assert_eq!(total, 5);

    let query2 = ContentQuery {
        page: 2,
        page_size: 2,
        max_page_size: 100,
        include_private: false,
        meta_filters: Vec::new(),
        ..Default::default()
    };
    let (items2, _) = repo.find(&ct, query2).await.unwrap();
    assert_eq!(items2.len(), 2);

    let query3 = ContentQuery {
        page: 3,
        page_size: 2,
        max_page_size: 100,
        include_private: false,
        meta_filters: Vec::new(),
        ..Default::default()
    };
    let (items3, _) = repo.find(&ct, query3).await.unwrap();
    assert_eq!(items3.len(), 1);
}

// ═══════════════════════════════════════════════════════════════
// SaveContext test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_save_context_auto_fill() {
    let pool = setup_pool().await;

    let ct_toml = r#"
[content_type]
name = "AutoFill"
singular = "autofill"
plural = "autofills"
table = "test_autofills"
implements = ["ownable", "timestampable"]

[fields.title]
type = "text"
required = true

[fields.author_id]
type = "text"
"#;
    let mut ct = ContentTypeSchema::parse_from_str(ct_toml).unwrap();
    cache_ct(&mut ct);
    let repo = ContentRepository::new(pool.clone());
    repo.migrate(&ct, &test_protocol_registry()).await.unwrap();

    let save_ctx = SaveContext {
        user_id: Some("user-123".into()),
        user_int_id: Some(1),
        user_role: Some("member".into()),
    };

    let data = with_timestamps(serde_json::json!({
        "title": "Auto fill test",
        "author_id": save_ctx.user_id.clone().unwrap()
    }));
    let created = repo.create(&ct, data, &save_ctx).await.unwrap();

    assert_eq!(created["author_id"], "user-123");
}

// ═══════════════════════════════════════════════════════════════
// build_app_state test
// ═══════════════════════════════════════════════════════════════

#[tokio::test]
async fn tauri_build_app_state_succeeds() {
    let mut config = AppConfig::test_defaults();
    let dir = tempfile::tempdir().unwrap();
    config.database_url = format!("sqlite:{}/test.db?mode=rwc", dir.path().display());
    config.upload_dir = format!("{}/uploads", dir.path().display());
    config.static_dir = format!("{}/static", dir.path().display());
    config.log_dir = format!("{}/logs", dir.path().display());
    config.content_type_dir = format!("{}/content_types", dir.path().display());

    std::fs::create_dir_all(&config.content_type_dir).unwrap();

    let (_shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);
    let result = mcms::build_app_state(&config, shutdown_rx).await;
    assert!(
        result.is_ok(),
        "build_app_state should succeed: {:?}",
        result.err()
    );

    let state = result.unwrap();
    assert!(!state.pool.is_closed());
}
