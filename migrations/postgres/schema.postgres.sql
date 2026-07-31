-- ============================================================
-- mcms complete database schema — PostgreSQL
-- Merged from all migration files for one-click initialization of new deployments
-- Generated date：2026-05-07
-- ============================================================

-- ── Platform foundation layer (always enabled) ──────────────────────────────────

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
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
    social_links JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

-- User credentials
CREATE TABLE IF NOT EXISTS user_credentials (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    auth_type VARCHAR(100) NOT NULL,
    identifier VARCHAR(500) NOT NULL,
    credential_data TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    UNIQUE(auth_type, identifier)
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_type ON user_credentials(auth_type);

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
    token_expires_at TIMESTAMPTZ,
    profile JSONB,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

-- OAuth short-lived state storage (PKCE)
CREATE TABLE IF NOT EXISTS oauth_states (
    id BIGINT PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    code_verifier VARCHAR(255) NOT NULL,
    user_id BIGINT,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Currency configuration
CREATE TABLE IF NOT EXISTS currencies (
    id BIGINT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE CHECK(code = UPPER(code) AND LENGTH(code) BETWEEN 1 AND 10),
    name TEXT NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 0 CHECK(decimals BETWEEN 0 AND 18),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);




-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Site options
CREATE TABLE IF NOT EXISTS options (
    id BIGINT PRIMARY KEY,
    option_key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    group_name VARCHAR(100) NOT NULL DEFAULT 'general',
    label VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT,
    validation JSONB,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    autoload BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

-- RBAC roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

-- RBAC permissions
CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT PRIMARY KEY,
    role_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    fields JSONB,
    conditions JSONB,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_role_action_subject
    ON permissions(role_id, action, subject);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT PRIMARY KEY,
    actor_id BIGINT,
    actor_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    subject_id VARCHAR(36),
    detail TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- API Token
CREATE TABLE IF NOT EXISTS api_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    token_prefix VARCHAR(50) NOT NULL,
    scopes JSONB NOT NULL DEFAULT '["read","write"]',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);

-- Webhook subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id BIGINT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    url VARCHAR(1024) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_enabled ON webhook_subscriptions(enabled);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant ON webhook_subscriptions(tenant_id);

-- Plugin KV storage
CREATE TABLE IF NOT EXISTS plugin_storage (
    plugin_id VARCHAR(100) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    PRIMARY KEY (plugin_id, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_plugin_storage_plugin ON plugin_storage(plugin_id);

-- Content revision history
CREATE TABLE IF NOT EXISTS content_revisions (
    id BIGINT PRIMARY KEY,
    content_type VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    revision_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by BIGINT,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    UNIQUE(content_type, record_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_revisions_ct_record_rev
    ON content_revisions(content_type, record_id, revision_number DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- SMS verification codes
CREATE TABLE IF NOT EXISTS sms_codes (
    id BIGINT PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_codes(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);

-- Background job queue
CREATE TABLE IF NOT EXISTS jobs (
    id           BIGINT PRIMARY KEY,
    job_type     VARCHAR(100) NOT NULL,
    payload      TEXT NOT NULL,
    status       VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempts     INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    run_after    TIMESTAMPTZ,
    error        TEXT,
    created_at   TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after ON jobs(status, run_after) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);

-- Cron job schedules
CREATE TABLE IF NOT EXISTS cron_schedules (
    id           BIGINT PRIMARY KEY,
    label        VARCHAR(255) NOT NULL,
    job_type     VARCHAR(100) NOT NULL,
    payload      TEXT,
    cron_expr    VARCHAR(100) NOT NULL,
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at  TIMESTAMPTZ,
    next_run_at  TIMESTAMPTZ NOT NULL,
    plugin_id    VARCHAR(100),
    created_at   TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_enabled ON cron_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_cron_next_run ON cron_schedules(next_run_at) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_cron_plugin ON cron_schedules(plugin_id);

-- Cron execution log
CREATE TABLE IF NOT EXISTS cron_execution_log (
    id           BIGINT PRIMARY KEY,
    schedule_id  BIGINT NOT NULL,
    job_type     VARCHAR(100) NOT NULL,
    label        VARCHAR(255) NOT NULL,
    status       VARCHAR(50) NOT NULL DEFAULT 'running',
    duration_ms  INTEGER,
    error        TEXT,
    started_at   TIMESTAMPTZ NOT NULL,
    finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cron_log_schedule ON cron_execution_log(schedule_id);
CREATE INDEX IF NOT EXISTS idx_cron_log_status ON cron_execution_log(status);
CREATE INDEX IF NOT EXISTS idx_cron_log_started ON cron_execution_log(started_at);

-- ── Built-in module: Blog (BUILTIN_BLOG=true) ──────────────────

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id BIGINT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by BIGINT,
    updated_by BIGINT,
    cover_image VARCHAR(500),
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    og_title VARCHAR(255),
    og_description VARCHAR(500),
    og_image VARCHAR(500),
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);



-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    cover_image VARCHAR(500),
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    og_title VARCHAR(255),
    og_description VARCHAR(500),
    og_image VARCHAR(500),
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image VARCHAR(500),
    image_ids TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by BIGINT NOT NULL,
    updated_by BIGINT,
    category_id BIGINT,
    view_count INTEGER NOT NULL DEFAULT 0,
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
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(created_by);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_created
    ON posts(status, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_category
    ON posts(status, category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_author
    ON posts(status, created_by);

-- Posts-Tags (many-to-many)
CREATE TABLE IF NOT EXISTS posts_tags (
    post_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_tags_tag_id ON posts_tags(tag_id);

CREATE TABLE IF NOT EXISTS taggings (
    id BIGINT PRIMARY KEY,
    tag_id BIGINT NOT NULL,
    taggable_type VARCHAR(50) NOT NULL,
    taggable_id BIGINT NOT NULL,
    UNIQUE(tag_id, taggable_type, taggable_id)
);

CREATE INDEX IF NOT EXISTS idx_taggings_tag ON taggings(tag_id);
CREATE INDEX IF NOT EXISTS idx_taggings_taggable ON taggings(taggable_type, taggable_id);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT PRIMARY KEY,
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
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_post_status
    ON comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id
    ON comments(parent_id);

-- ── Built-in module: Pages (BUILTIN_PAGES=true) ────────────────

CREATE TABLE IF NOT EXISTS pages (
    id               BIGINT PRIMARY KEY,
    title            TEXT NOT NULL,
    slug             VARCHAR(255) NOT NULL UNIQUE,
    content          TEXT,
    blocks           JSONB,
    meta_title       VARCHAR(255),
    meta_description VARCHAR(500),
    og_image         VARCHAR(500),
    template         VARCHAR(100) NOT NULL DEFAULT 'default',
    parent_id        BIGINT,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    status           VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by       BIGINT NOT NULL,
    updated_by       BIGINT,
    cover_image      VARCHAR(500),
    published_at     TIMESTAMPTZ,
    password VARCHAR(255),
    comment_status VARCHAR(20) NOT NULL DEFAULT 'closed',
    og_title VARCHAR(255),
    og_description VARCHAR(500),
    canonical_url VARCHAR(1024),
    created_at       TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_status    ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_parent    ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_author    ON pages(created_by);

CREATE TABLE IF NOT EXISTS reusable_blocks (
    id          BIGINT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    block_type  TEXT NOT NULL,
    content     TEXT NOT NULL,
    description TEXT,
    created_by  BIGINT,
    updated_by  BIGINT,
    created_at  TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

-- ── Built-in module: Media (BUILTIN_MEDIA=true) ────────────────

CREATE TABLE IF NOT EXISTS media (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    title VARCHAR(255),
    alt_text VARCHAR(255),
    caption TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_user_created
    ON media(user_id, created_at DESC);

-- ── Built-in module: Workflow (BUILTIN_WORKFLOW=true) ──────────

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL,
    initial_step VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id BIGINT PRIMARY KEY,
    definition_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    current_step VARCHAR(100),
    context JSONB NOT NULL DEFAULT '{}',
    triggered_by BIGINT,
    started_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_instances_definition ON workflow_instances(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_instances_status ON workflow_instances(status);

CREATE TABLE IF NOT EXISTS workflow_step_logs (
    id BIGINT PRIMARY KEY,
    instance_id BIGINT NOT NULL,
    step_id VARCHAR(100) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    input TEXT,
    output TEXT,
    error TEXT,
    started_at TIMESTAMPTZ(0) NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wf_step_logs_instance ON workflow_step_logs(instance_id);



-- ============================================================
-- Seed data
-- ============================================================

-- Default currencies
INSERT INTO currencies (id, code, name, decimals) VALUES
    (10001, 'CNY', 'Chinese Yuan', 2),
    (10002, 'USD', 'US Dollar', 2),
    (10003, 'EUR', 'Euro', 2),
    (10004, 'GBP', 'British Pound', 2),
    (10005, 'JPY', 'Japanese Yen', 0)
ON CONFLICT DO NOTHING;

-- System roles
INSERT INTO roles (id, name, description, is_system, created_at, updated_at) VALUES
    (10001, 'admin', 'Super administrator', TRUE, NOW(), NOW()),
    (10002, 'editor', 'Editor', FALSE, NOW(), NOW()),
    (10003, 'author', 'Author', FALSE, NOW(), NOW()),
    (10004, 'reader', 'Reader', TRUE, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Admin global permissions
INSERT INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10001, (SELECT id FROM roles WHERE name = 'admin'), '*', '*', '["*"]', NULL, NOW())
ON CONFLICT (role_id, action, subject) DO NOTHING;

-- Editor permissions
INSERT INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10002, (SELECT id FROM roles WHERE name = 'editor'), 'content-type::*.*', 'content-type::*', '["*"]', NULL, NOW())
ON CONFLICT (role_id, action, subject) DO NOTHING;

-- Author permissions
INSERT INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10003, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.create', 'content-type::post', '["*"]', NULL, NOW()),
    (10004, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.read', 'content-type::post', '["*"]', NULL, NOW()),
    (10005, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.update', 'content-type::post', '["*"]', '{"author_id":"$user.id"}', NOW()),
    (10006, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.delete', 'content-type::post', '["*"]', '{"author_id":"$user.id"}', NOW())
ON CONFLICT (role_id, action, subject) DO NOTHING;

-- Reader permissions
INSERT INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10007, (SELECT id FROM roles WHERE name = 'reader'), 'content-type::post.read', 'content-type::post', '["title","slug","content","excerpt","status"]', NULL, NOW()),
    (10008, (SELECT id FROM roles WHERE name = 'reader'), 'content-type::comment.create', 'content-type::comment', '["content","nickname","email"]', NULL, NOW())
ON CONFLICT (role_id, action, subject) DO NOTHING;

-- Site options
INSERT INTO options (id, option_key, value, type, group_name, label, description, validation, is_public, autoload, sort_order, updated_at) VALUES
    (10001, 'site_title', '"My Blog"', 'text', 'general', 'Site title', 'Displayed in browser title bar and page header', '{"max_length":100}', TRUE, TRUE, 1, NOW()),
    (10002, 'site_description', '""', 'text', 'general', 'Site description', 'Brief description of the site purpose', '{"max_length":500}', TRUE, TRUE, 2, NOW()),
    (10003, 'site_url', '""', 'url', 'general', 'Site URL', 'e.g. https://example.com', NULL, TRUE, TRUE, 3, NOW()),
    (10004, 'admin_email', '""', 'email', 'general', 'Admin email', NULL, NULL, FALSE, TRUE, 4, NOW()),
    (10005, 'timezone', '"UTC"', 'select', 'general', 'Timezone', NULL, '{"values":["UTC","Asia/Shanghai","Asia/Tokyo","US/Eastern","US/Pacific","Europe/London","Europe/Berlin"]}', TRUE, TRUE, 5, NOW()),
    (10006, 'date_format', '"%Y-%m-%d"', 'select', 'general', 'Date format', NULL, '{"values":["%Y-%m-%d","%d/%m/%Y","%m/%d/%Y","%Y年%m月%d日"]}', TRUE, TRUE, 6, NOW()),
    (10007, 'posts_per_page', '10', 'integer', 'reading', 'Posts per page', NULL, '{"min":1,"max":100}', TRUE, TRUE, 10, NOW()),
    (10008, 'rss_items', '20', 'integer', 'reading', 'RSS item count', NULL, '{"min":1,"max":100}', TRUE, TRUE, 11, NOW()),
    (10009, 'permalink_structure', '"/:year/:month/:slug"', 'select', 'reading', 'URL structure', NULL, '{"values":["/:year/:month/:slug","/:slug","/posts/:slug"]}', TRUE, TRUE, 12, NOW()),
    (10010, 'comment_moderation', 'true', 'boolean', 'discussion', 'Comments require moderation', 'When enabled, new comments require admin approval', NULL, FALSE, TRUE, 20, NOW()),
    (10011, 'comment_order', '"asc"', 'select', 'discussion', 'Comment order', NULL, '{"values":["asc","desc"]}', TRUE, TRUE, 21, NOW()),
    (10012, 'default_role', '"reader"', 'select', 'discussion', 'Default role for new users', NULL, '{"values":["reader","author"]}', FALSE, TRUE, 22, NOW()),
    (10013, 'theme', '"default"', 'select', 'appearance', 'Current theme', NULL, '{"values":["default","corporate","minimal","warm"]}', TRUE, TRUE, 30, NOW()),
    (10014, 'maintenance_mode', 'false', 'boolean', 'appearance', 'Maintenance mode', 'When enabled, a maintenance page is shown to visitors', NULL, TRUE, TRUE, 31, NOW())
ON CONFLICT (option_key) DO NOTHING;
