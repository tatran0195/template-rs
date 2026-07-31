-- ============================================================
-- mcms complete database schema
-- Merged from all migration files for one-click initialization of new deployments
-- Generated date：2026-05-07
-- ============================================================

-- ── Platform foundation layer (always enabled) ──────────────────────────────────

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'reader',
    avatar TEXT,
    bio TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    registered_via TEXT NOT NULL,
    display_name TEXT,
    slug TEXT UNIQUE,
    locale TEXT,
    social_links TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- User credentials
CREATE TABLE IF NOT EXISTS user_credentials (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    auth_type TEXT NOT NULL,
    identifier TEXT NOT NULL,
    credential_data TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(auth_type, identifier)
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_type ON user_credentials(auth_type);

-- OAuth account bindings
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TEXT,
    profile TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

-- OAuth short-lived state storage (PKCE)
CREATE TABLE IF NOT EXISTS oauth_states (
    id INTEGER PRIMARY KEY,
    provider TEXT NOT NULL,
    code_verifier TEXT NOT NULL,
    user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Currency configuration
CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE CHECK(code = UPPER(code) AND LENGTH(code) BETWEEN 1 AND 10),
    name TEXT NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 0 CHECK(decimals BETWEEN 0 AND 18),
    is_active INTEGER NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Site options
CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY,
    option_key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    group_name TEXT NOT NULL DEFAULT 'general',
    label TEXT NOT NULL DEFAULT '',
    description TEXT,
    validation TEXT,
    is_public BOOLEAN NOT NULL DEFAULT 0,
    autoload BOOLEAN NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- RBAC roles
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- RBAC permissions
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY,
    role_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    subject TEXT NOT NULL,
    fields TEXT,
    conditions TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_role_action_subject
    ON permissions(role_id, action, subject);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY,
    actor_id INTEGER,
    actor_role TEXT,
    action TEXT NOT NULL,
    subject TEXT NOT NULL,
    subject_id TEXT,
    detail TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);


CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- API Token
CREATE TABLE IF NOT EXISTS api_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    token_prefix TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '["read","write"]',
    last_used_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);

-- Webhook subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT NOT NULL DEFAULT '[]',
    enabled INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_enabled ON webhook_subscriptions(enabled);

-- Plugin KV storage
CREATE TABLE IF NOT EXISTS plugin_storage (
    plugin_id TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (plugin_id, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_plugin_storage_plugin ON plugin_storage(plugin_id);

-- Content revision history
CREATE TABLE IF NOT EXISTS content_revisions (
    id INTEGER PRIMARY KEY,
    content_type TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    revision_number INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(content_type, record_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_revisions_ct_record_rev
    ON content_revisions(content_type, record_id, revision_number DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- SMS verification codes
CREATE TABLE IF NOT EXISTS sms_codes (
    id INTEGER PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_codes(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);

-- Background job queue
CREATE TABLE IF NOT EXISTS jobs (
    id           INTEGER PRIMARY KEY,
    job_type     TEXT NOT NULL,
    payload      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    attempts     INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    run_after    TEXT,
    error        TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after ON jobs(status, run_after);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);

-- Cron job schedules
CREATE TABLE IF NOT EXISTS cron_schedules (
    id           INTEGER PRIMARY KEY,
    label        TEXT NOT NULL,
    job_type     TEXT NOT NULL,
    payload      TEXT,
    cron_expr    TEXT NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 1,
    last_run_at  TEXT,
    next_run_at  TEXT NOT NULL,
    plugin_id    TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cron_enabled ON cron_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_cron_next_run ON cron_schedules(next_run_at) WHERE enabled = 1;
CREATE INDEX IF NOT EXISTS idx_cron_plugin ON cron_schedules(plugin_id);

-- Cron execution log
CREATE TABLE IF NOT EXISTS cron_execution_log (
    id           INTEGER PRIMARY KEY,
    schedule_id  INTEGER NOT NULL,
    job_type     TEXT NOT NULL,
    label        TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'running',
    duration_ms  INTEGER,
    error        TEXT,
    started_at   TEXT NOT NULL,
    finished_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_log_schedule ON cron_execution_log(schedule_id);
CREATE INDEX IF NOT EXISTS idx_cron_log_status ON cron_execution_log(status);
CREATE INDEX IF NOT EXISTS idx_cron_log_started ON cron_execution_log(started_at);

-- ── Built-in module: Blog (BUILTIN_BLOG=true) ──────────────────

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    updated_by INTEGER,
    cover_image TEXT,
    meta_title TEXT,
    meta_description TEXT,
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);



-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_by INTEGER,
    updated_by INTEGER,
    description TEXT,
    cover_image TEXT,
    meta_title TEXT,
    meta_description TEXT,
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image TEXT,
    image_ids TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    category_id INTEGER,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    password TEXT,
    comment_status TEXT NOT NULL DEFAULT 'open',
    format TEXT NOT NULL DEFAULT 'standard',
    template TEXT NOT NULL DEFAULT 'default',
    meta_title TEXT,
    meta_description TEXT,
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    canonical_url TEXT,
    reading_time INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    published_at TEXT
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
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_tags_tag_id ON posts_tags(tag_id);

CREATE TABLE IF NOT EXISTS taggings (
    id INTEGER PRIMARY KEY,
    tag_id INTEGER NOT NULL,
    taggable_type TEXT NOT NULL,
    taggable_id INTEGER NOT NULL,
    UNIQUE(tag_id, taggable_type, taggable_id)
);

CREATE INDEX IF NOT EXISTS idx_taggings_tag ON taggings(tag_id);
CREATE INDEX IF NOT EXISTS idx_taggings_taggable ON taggings(taggable_type, taggable_id);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL,
    created_by INTEGER,
    updated_by INTEGER,
    nickname TEXT,
    email TEXT,
    content TEXT NOT NULL,
    parent_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    author_ip TEXT,
    author_url TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_post_status
    ON comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id
    ON comments(parent_id);

-- ── Built-in module: Pages (BUILTIN_PAGES=true) ────────────────

CREATE TABLE IF NOT EXISTS pages (
    id               INTEGER PRIMARY KEY,
    title            TEXT NOT NULL,
    slug             TEXT NOT NULL UNIQUE,
    content          TEXT,
    blocks           TEXT,
    meta_title       TEXT,
    meta_description TEXT,
    og_image         TEXT,
    template         TEXT NOT NULL DEFAULT 'default',
    parent_id        INTEGER,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'draft',
    created_by       INTEGER NOT NULL,
    updated_by       INTEGER,
    cover_image      TEXT,
    published_at     TEXT,
    password TEXT,
    comment_status TEXT NOT NULL DEFAULT 'closed',
    og_title TEXT,
    og_description TEXT,
    canonical_url TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_status    ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_parent    ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_author    ON pages(created_by);

CREATE TABLE IF NOT EXISTS reusable_blocks (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    block_type  TEXT NOT NULL,
    content     TEXT NOT NULL,
    description TEXT,
    created_by  INTEGER,
    updated_by  INTEGER,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── Built-in module: Media (BUILTIN_MEDIA=true) ────────────────

CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    title TEXT,
    alt_text TEXT,
    caption TEXT,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_media_user_created
    ON media(user_id, created_at DESC);

-- ── Built-in module: Workflow (BUILTIN_WORKFLOW=true) ──────────

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    steps TEXT NOT NULL,
    initial_step TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id INTEGER PRIMARY KEY,
    definition_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    current_step TEXT,
    context TEXT NOT NULL DEFAULT '{}',
    triggered_by INTEGER,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_instances_definition ON workflow_instances(definition_id);
CREATE INDEX IF NOT EXISTS idx_wf_instances_status ON workflow_instances(status);

CREATE TABLE IF NOT EXISTS workflow_step_logs (
    id INTEGER PRIMARY KEY,
    instance_id INTEGER NOT NULL,
    step_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    input TEXT,
    output TEXT,
    error TEXT,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_wf_step_logs_instance ON workflow_step_logs(instance_id);



-- ============================================================
-- Seed data
-- ============================================================

-- Default currencies
INSERT OR IGNORE INTO currencies (id, code, name, decimals) VALUES
    (10001, 'CNY', 'Chinese Yuan', 2),
    (10002, 'USD', 'US Dollar', 2),
    (10003, 'EUR', 'Euro', 2),
    (10004, 'GBP', 'British Pound', 2),
    (10005, 'JPY', 'Japanese Yen', 0);

-- System roles
INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at) VALUES
    (10001, 'admin', 'Super administrator', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10002, 'editor', 'Editor', 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10003, 'author', 'Author', 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10004, 'reader', 'Reader', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- Admin global permissions
INSERT OR IGNORE INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10001, (SELECT id FROM roles WHERE name = 'admin'), '*', '*', '["*"]', NULL, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- Editor permissions
INSERT OR IGNORE INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10002, (SELECT id FROM roles WHERE name = 'editor'), 'content-type::*.*', 'content-type::*', '["*"]', NULL, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- Author permissions
INSERT OR IGNORE INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10003, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.create', 'content-type::post', '["*"]', NULL, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10004, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.read', 'content-type::post', '["*"]', NULL, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10005, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.update', 'content-type::post', '["*"]', '{"author_id":"$user.id"}', strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10006, (SELECT id FROM roles WHERE name = 'author'), 'content-type::post.delete', 'content-type::post', '["*"]', '{"author_id":"$user.id"}', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- Reader permissions
INSERT OR IGNORE INTO permissions (id, role_id, action, subject, fields, conditions, created_at) VALUES
    (10007, (SELECT id FROM roles WHERE name = 'reader'), 'content-type::post.read', 'content-type::post', '["title","slug","content","excerpt","status"]', NULL, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10008, (SELECT id FROM roles WHERE name = 'reader'), 'content-type::comment.create', 'content-type::comment', '["content","nickname","email"]', NULL, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- Site options
INSERT OR IGNORE INTO options (id, option_key, value, type, group_name, label, description, validation, is_public, autoload, sort_order, updated_at) VALUES
    (10001, 'site_title', '"My Blog"', 'text', 'general', 'Site title', 'Displayed in browser title bar and page header', '{"max_length":100}', 1, 1, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10002, 'site_description', '""', 'text', 'general', 'Site description', 'Brief description of the site purpose', '{"max_length":500}', 1, 1, 2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10003, 'site_url', '""', 'url', 'general', 'Site URL', 'e.g. https://example.com', NULL, 1, 1, 3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10004, 'admin_email', '""', 'email', 'general', 'Admin email', NULL, NULL, 0, 1, 4, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10005, 'timezone', '"UTC"', 'select', 'general', 'Timezone', NULL, '{"values":["UTC","Asia/Shanghai","Asia/Tokyo","US/Eastern","US/Pacific","Europe/London","Europe/Berlin"]}', 1, 1, 5, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10006, 'date_format', '"%Y-%m-%d"', 'select', 'general', 'Date format', NULL, '{"values":["%Y-%m-%d","%d/%m/%Y","%m/%d/%Y","%Y年%m月%d日"]}', 1, 1, 6, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10007, 'posts_per_page', '10', 'integer', 'reading', 'Posts per page', NULL, '{"min":1,"max":100}', 1, 1, 10, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10008, 'rss_items', '20', 'integer', 'reading', 'RSS item count', NULL, '{"min":1,"max":100}', 1, 1, 11, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10009, 'permalink_structure', '"/:year/:month/:slug"', 'select', 'reading', 'URL structure', NULL, '{"values":["/:year/:month/:slug","/:slug","/posts/:slug"]}', 1, 1, 12, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10010, 'comment_moderation', 'true', 'boolean', 'discussion', 'Comments require moderation', 'When enabled, new comments require admin approval', NULL, 0, 1, 20, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10011, 'comment_order', '"asc"', 'select', 'discussion', 'Comment order', NULL, '{"values":["asc","desc"]}', 1, 1, 21, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10012, 'default_role', '"reader"', 'select', 'discussion', 'Default role for new users', NULL, '{"values":["reader","author"]}', 0, 1, 22, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10013, 'theme', '"default"', 'select', 'appearance', 'Current theme', NULL, '{"values":["default","corporate","minimal","warm"]}', 1, 1, 30, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    (10014, 'maintenance_mode', 'false', 'boolean', 'appearance', 'Maintenance mode', 'When enabled, a maintenance page is shown to visitors', NULL, 1, 1, 31, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
