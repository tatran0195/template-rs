-- ============================================================
-- axe complete database schema — MySQL (with multi-tenant support)
-- Merged from all migration files for one-click initialization of new deployments
-- Generated date：2026-05-07
--
-- MySQL notes:
-- - All INDEX definitions are inline in CREATE TABLE for idempotent re-execution
-- - Partial indexes with WHERE clauses are not supported, removed
-- - BOOLEAN is actually TINYINT(1)
-- ============================================================

-- ── Platform foundation layer (always enabled) ──────────────────────────────────

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255) UNIQUE,
    config TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    username VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'reader',
    avatar VARCHAR(500),
    bio TEXT,
    website VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    registered_via VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    slug VARCHAR(100) UNIQUE,
    locale VARCHAR(10),
    social_links TEXT,
    metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User credentials
CREATE TABLE IF NOT EXISTS user_credentials (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    auth_type VARCHAR(100) NOT NULL,
    identifier VARCHAR(500) NOT NULL,
    credential_data TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_credential_type_id (auth_type, identifier),
    INDEX idx_user_credentials_user (user_id),
    INDEX idx_user_credentials_type (auth_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OAuth account bindings
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    access_token VARCHAR(1024),
    refresh_token VARCHAR(1024),
    token_expires_at DATETIME,
    profile TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_oauth_provider (provider, provider_user_id),
    INDEX idx_oauth_accounts_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OAuth short-lived state storage (PKCE)
CREATE TABLE IF NOT EXISTS oauth_states (
    id BIGINT PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    code_verifier VARCHAR(255) NOT NULL,
    user_id BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_oauth_states_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Currency configuration
CREATE TABLE IF NOT EXISTS currencies (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    decimals INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_currencies_tenant_code (tenant_id, code),
    CONSTRAINT chk_currencies_code CHECK (code = UPPER(code) AND CHAR_LENGTH(code) BETWEEN 1 AND 10),
    CONSTRAINT chk_currencies_decimals CHECK (decimals BETWEEN 0 AND 18)
);



-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site options
CREATE TABLE IF NOT EXISTS options (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    `option_key` VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'text',
    group_name VARCHAR(100) NOT NULL DEFAULT 'general',
    label VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT,
    validation TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    autoload BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_options_tenant_option_key (tenant_id, `option_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RBAC roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_roles_tenant_name (tenant_id, name),
    INDEX idx_roles_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RBAC permissions
CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    role_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    fields TEXT,
    conditions TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_permissions_role_action_subject (role_id, action, subject),
    INDEX idx_permissions_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    actor_id BIGINT,
    actor_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    subject_id VARCHAR(36),
    detail TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_actor (actor_id),
    INDEX idx_audit_log_tenant_created (tenant_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Token
CREATE TABLE IF NOT EXISTS api_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    token_prefix VARCHAR(50) NOT NULL,
    scopes TEXT NOT NULL,
    last_used_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_tokens_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    url VARCHAR(1024) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webhook_subscriptions_enabled (enabled),
    INDEX idx_webhook_subscriptions_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plugin KV storage
CREATE TABLE IF NOT EXISTS plugin_storage (
    plugin_id VARCHAR(100) NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    expires_at DATETIME,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (plugin_id, `storage_key`),
    INDEX idx_plugin_storage_plugin (plugin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content revision history
CREATE TABLE IF NOT EXISTS content_revisions (
    id BIGINT PRIMARY KEY,
    content_type VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    revision_number INT NOT NULL,
    snapshot TEXT NOT NULL,
    created_by BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_revision (content_type, record_id, revision_number),
    INDEX idx_revisions_ct_record_rev (content_type, record_id, revision_number DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_reset_tokens_user_id (user_id),
    INDEX idx_password_reset_tokens_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SMS verification codes
CREATE TABLE IF NOT EXISTS sms_codes (
    id BIGINT PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME,
    attempts INT NOT NULL DEFAULT 0,
    ip_address VARCHAR(45),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sms_codes_phone (phone),
    INDEX idx_sms_codes_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_verification_tokens_user_id (user_id),
    INDEX idx_email_verification_tokens_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Background job queue
CREATE TABLE IF NOT EXISTS jobs (
    id           BIGINT PRIMARY KEY,
    job_type     VARCHAR(100) NOT NULL,
    payload      TEXT NOT NULL,
    status       VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempts     INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    run_after    DATETIME,
    error        TEXT,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_jobs_status_run_after (status, run_after),
    INDEX idx_jobs_type (job_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cron job schedules
CREATE TABLE IF NOT EXISTS cron_schedules (
    id           BIGINT PRIMARY KEY,
    label        VARCHAR(255) NOT NULL,
    job_type     VARCHAR(100) NOT NULL,
    payload      TEXT,
    cron_expr    VARCHAR(100) NOT NULL,
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at  DATETIME,
    next_run_at  DATETIME NOT NULL,
    plugin_id    VARCHAR(100),
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cron_enabled (enabled),
    INDEX idx_cron_next_run (next_run_at),
    INDEX idx_cron_plugin (plugin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cron execution log
CREATE TABLE IF NOT EXISTS cron_execution_log (
    id           BIGINT PRIMARY KEY,
    schedule_id  BIGINT NOT NULL,
    job_type     VARCHAR(100) NOT NULL,
    label        VARCHAR(255) NOT NULL,
    status       VARCHAR(50) NOT NULL DEFAULT 'running',
    duration_ms  INT,
    error        TEXT,
    started_at   DATETIME NOT NULL,
    finished_at  DATETIME,
    INDEX idx_cron_log_schedule (schedule_id),
    INDEX idx_cron_log_status (status),
    INDEX idx_cron_log_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Built-in module: Blog (BUILTIN_BLOG=true) ──────────────────

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id BIGINT,
    sort_order INT NOT NULL DEFAULT 0,
    created_by BIGINT,
    updated_by BIGINT,
    cover_image VARCHAR(500),
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    og_title VARCHAR(255),
    og_description VARCHAR(500),
    og_image VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categories_tenant_name (tenant_id, name),
    UNIQUE KEY uq_categories_tenant_slug (tenant_id, slug),
    INDEX idx_categories_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    description TEXT,
    cover_image VARCHAR(500),
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    og_title VARCHAR(255),
    og_description VARCHAR(500),
    og_image VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tags_tenant_name (tenant_id, name),
    UNIQUE KEY uq_tags_tenant_slug (tenant_id, slug),
    INDEX idx_tags_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posts
CREATE TABLE IF NOT EXISTS posts (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    excerpt TEXT,
    cover_image VARCHAR(500),
    image_ids TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by BIGINT NOT NULL,
    updated_by BIGINT,
    category_id BIGINT,
    view_count INT NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    password VARCHAR(255),
    comment_status VARCHAR(20) NOT NULL DEFAULT 'open',
    format VARCHAR(20) NOT NULL DEFAULT 'standard',
    template VARCHAR(100) NOT NULL DEFAULT 'default',
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    og_title VARCHAR(255),
    og_description VARCHAR(500),
    og_image VARCHAR(500),
    canonical_url VARCHAR(1024),
    reading_time INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    INDEX idx_posts_status (status),
    INDEX idx_posts_author (created_by),
    INDEX idx_posts_category (category_id),
    INDEX idx_posts_status_created (status, is_pinned DESC, created_at DESC),
    INDEX idx_posts_status_category (status, category_id),
    INDEX idx_posts_status_author (status, created_by),
    INDEX idx_posts_tenant (tenant_id),
    UNIQUE KEY uq_posts_tenant_slug (tenant_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posts-Tags (many-to-many)
CREATE TABLE IF NOT EXISTS posts_tags (
    post_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    INDEX idx_posts_tags_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS taggings (
    id BIGINT PRIMARY KEY,
    tag_id BIGINT NOT NULL,
    taggable_type VARCHAR(50) NOT NULL,
    taggable_id BIGINT NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default',
    UNIQUE KEY uq_taggings_tenant (tenant_id, tag_id, taggable_type, taggable_id),
    INDEX idx_taggings_taggable (taggable_type, taggable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    post_id BIGINT NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    nickname VARCHAR(100),
    email VARCHAR(255),
    content TEXT NOT NULL,
    parent_id BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    author_ip VARCHAR(45),
    author_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comments_post (post_id),
    INDEX idx_comments_status (status),
    INDEX idx_comments_post_status (post_id, status),
    INDEX idx_comments_parent_id (parent_id),
    INDEX idx_comments_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Built-in module: Pages (BUILTIN_PAGES=true) ────────────────

CREATE TABLE IF NOT EXISTS pages (
    id               BIGINT PRIMARY KEY,
    tenant_id        VARCHAR(36) NOT NULL DEFAULT 'default',
    title            VARCHAR(500) NOT NULL,
    slug             VARCHAR(255) NOT NULL UNIQUE,
    content          LONGTEXT,
    blocks           TEXT,
    meta_title       VARCHAR(255),
    meta_description VARCHAR(500),
    og_image         VARCHAR(500),
    template         VARCHAR(100) NOT NULL DEFAULT 'default',
    parent_id        BIGINT,
    sort_order       INT NOT NULL DEFAULT 0,
    status           VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by       BIGINT NOT NULL,
    updated_by       BIGINT,
    cover_image      VARCHAR(500),
    published_at     DATETIME,
    password         VARCHAR(255),
    comment_status   VARCHAR(20) NOT NULL DEFAULT 'closed',
    og_title         VARCHAR(255),
    og_description   VARCHAR(500),
    canonical_url    VARCHAR(1024),
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pages_status (status),
    INDEX idx_pages_parent (parent_id),
    INDEX idx_pages_author (created_by),
    INDEX idx_pages_tenant_slug (tenant_id, slug),
    INDEX idx_pages_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reusable_blocks (
    id          BIGINT PRIMARY KEY,
    tenant_id   VARCHAR(36) NOT NULL DEFAULT 'default',
    name        VARCHAR(255) NOT NULL,
    block_type  VARCHAR(100) NOT NULL,
    content     LONGTEXT NOT NULL,
    description TEXT,
    created_by  BIGINT,
    updated_by  BIGINT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reusable_blocks_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Built-in module: Media (BUILTIN_MEDIA=true) ────────────────

CREATE TABLE IF NOT EXISTS media (
    id BIGINT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    user_id BIGINT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    width INT,
    height INT,
    title VARCHAR(255),
    alt_text VARCHAR(255),
    caption TEXT,
    description TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_media_user_created (user_id, created_at DESC),
    INDEX idx_media_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Built-in module: Workflow (BUILTIN_WORKFLOW=true) ──────────

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps TEXT NOT NULL,
    initial_step VARCHAR(100) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_instances (
    id BIGINT PRIMARY KEY,
    definition_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    current_step VARCHAR(100),
    context TEXT NOT NULL,
    triggered_by BIGINT,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_wf_instances_definition (definition_id),
    INDEX idx_wf_instances_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_step_logs (
    id BIGINT PRIMARY KEY,
    instance_id BIGINT NOT NULL,
    step_id VARCHAR(100) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    input LONGTEXT,
    output LONGTEXT,
    error TEXT,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    INDEX idx_wf_step_logs_instance (instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ============================================================
-- Seed data
-- ============================================================

-- Default tenant
INSERT IGNORE INTO tenants (id, name, domain, config, status, created_at, updated_at) VALUES
    (10001, 'Default', NULL, '{}', 'active', NOW(), NOW());

-- Default currencies
INSERT IGNORE INTO currencies (id, tenant_id, code, name, decimals) VALUES
    (10001, 'default', 'CNY', 'Chinese Yuan', 2),
    (10002, 'default', 'USD', 'US Dollar', 2),
    (10003, 'default', 'EUR', 'Euro', 2),
    (10004, 'default', 'GBP', 'British Pound', 2),
    (10005, 'default', 'JPY', 'Japanese Yen', 0);

-- System roles
INSERT IGNORE INTO roles (id, tenant_id, name, description, is_system, created_at, updated_at) VALUES
    (10001, 'default', 'admin', 'Super administrator', TRUE, NOW(), NOW()),
    (10002, 'default', 'editor', 'Editor', FALSE, NOW(), NOW()),
    (10003, 'default', 'author', 'Author', FALSE, NOW(), NOW()),
    (10004, 'default', 'reader', 'Reader', TRUE, NOW(), NOW());

-- Admin global permissions
INSERT IGNORE INTO permissions (id, tenant_id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10001, 'default', (SELECT id FROM roles WHERE name = 'admin'), '*', '*', '["*"]', NULL, NOW());

-- Editor permissions
INSERT IGNORE INTO permissions (id, tenant_id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10002, 'default', (SELECT id FROM roles WHERE name = 'editor'), 'content-type::*.*', 'content-type::*', '["*"]', NULL, NOW());

-- Author permissions
INSERT IGNORE INTO permissions (id, tenant_id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10003, 'default', (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.create', 'content-type::post', '["*"]', NULL, NOW()),
    (10004, 'default', (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.read', 'content-type::post', '["*"]', NULL, NOW()),
    (10005, 'default', (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.update', 'content-type::post', '["*"]', '{"author_id":"$user.id"}', NOW()),
    (10006, 'default', (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.delete', 'content-type::post', '["*"]', '{"author_id":"$user.id"}', NOW());

-- Reader permissions
INSERT IGNORE INTO permissions (id, tenant_id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10007, 'default', (SELECT id FROM roles WHERE name = 'reader'), 'content-type::post.read', 'content-type::post', '["title","slug","content","excerpt","status"]', NULL, NOW()),
    (10008, 'default', (SELECT id FROM roles WHERE name = 'reader'), 'content-type::comment.create', 'content-type::comment', '["content","nickname","email"]', NULL, NOW());

-- Site options
INSERT IGNORE INTO options (id, tenant_id, `option_key`, value, `type`, group_name, label, description, validation, is_public, autoload, sort_order, updated_at) VALUES
    (10001, 'default', 'site_title', '"My Blog"', 'text', 'general', 'Site title', 'Displayed in browser title bar and page header', '{"max_length":100}', TRUE, TRUE, 1, NOW()),
    (10002, 'default', 'site_description', '""', 'text', 'general', 'Site description', 'Brief description of the site purpose', '{"max_length":500}', TRUE, TRUE, 2, NOW()),
    (10003, 'default', 'site_url', '""', 'url', 'general', 'Site URL', 'e.g. https://example.com', NULL, TRUE, TRUE, 3, NOW()),
    (10004, 'default', 'admin_email', '""', 'email', 'general', 'Admin email', NULL, NULL, FALSE, TRUE, 4, NOW()),
    (10005, 'default', 'timezone', '"UTC"', 'select', 'general', 'Timezone', NULL, '{"values":["UTC","Asia/Shanghai","Asia/Tokyo","US/Eastern","US/Pacific","Europe/London","Europe/Berlin"]}', TRUE, TRUE, 5, NOW()),
    (10006, 'default', 'date_format', '"%Y-%m-%d"', 'select', 'general', 'Date format', NULL, '{"values":["%Y-%m-%d","%d/%m/%Y","%m/%d/%Y","%Y年%m月%d日"]}', TRUE, TRUE, 6, NOW()),
    (10007, 'default', 'posts_per_page', '10', 'integer', 'reading', 'Posts per page', NULL, '{"min":1,"max":100}', TRUE, TRUE, 10, NOW()),
    (10008, 'default', 'rss_items', '20', 'integer', 'reading', 'RSS item count', NULL, '{"min":1,"max":100}', TRUE, TRUE, 11, NOW()),
    (10009, 'default', 'permalink_structure', '"/:year/:month/:slug"', 'select', 'reading', 'URL structure', NULL, '{"values":["/:year/:month/:slug","/:slug","/posts/:slug"]}', TRUE, TRUE, 12, NOW()),
    (10010, 'default', 'comment_moderation', 'true', 'boolean', 'discussion', 'Comments require moderation', 'When enabled, new comments require admin approval', NULL, FALSE, TRUE, 20, NOW()),
    (10011, 'default', 'comment_order', '"asc"', 'select', 'discussion', 'Comment order', NULL, '{"values":["asc","desc"]}', TRUE, TRUE, 21, NOW()),
    (10012, 'default', 'default_role', '"reader"', 'select', 'discussion', 'Default role for new users', NULL, '{"values":["reader","author"]}', FALSE, TRUE, 22, NOW()),
    (10013, 'default', 'theme', '"default"', 'select', 'appearance', 'Current theme', NULL, '{"values":["default","corporate","minimal","warm"]}', TRUE, TRUE, 30, NOW()),
    (10014, 'default', 'maintenance_mode', 'false', 'boolean', 'appearance', 'Maintenance mode', 'When enabled, a maintenance page is shown to visitors', NULL, TRUE, TRUE, 31, NOW());
