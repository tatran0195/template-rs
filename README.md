<p align="center">
  <h1 align="center">mcms</h1>
  <p align="center">
    <strong>The fastest CMS, easiest to deploy.</strong>
  </p>
  <p align="center">
    Rust-powered high-performance BaaS and headless CMS with built-in blog. JS / Rhai / Lua / WASM plugin engines for infinite extensibility.<br>
    Single binary, zero dependencies, zero GC. Download and run.
  </p>
</p>

---

> **Early Alpha — API may change before v1.0.**
> Targeting stable v1.0 in Q3 2026.

---

## Why mcms?

**Single binary, full capability**
One binary, no Node.js, no Docker, no runtime. Blog is native built-in — not plugin assemblies, but the skeleton itself.

**Rust performance, zero-GC stability**
Sub-millisecond reads, zero performance degradation over time. No GC pauses, no memory leaks, no 3 AM OOM alerts.

**4 plugin engines, inspired by Strapi**
JS, Rhai, Lua, and WASM — a full spectrum from scripting to compiled. Dynamic language productivity with a Rust performance foundation.

---

## What's Built-In

| Module            | Features                                                      |
| ----------------- | ------------------------------------------------------------- |
| **Blog / CMS**    | Posts, pages, categories, tags, comments, media, RSS, sitemap |
| **OAuth**         | GitHub, Google and more social login                          |
| **Workflow**      | Job queue, cron scheduler, AOP aspects, event bus             |
| **Content Types** | Dynamic schema via TOML, automatic CRUD API                   |
| **Auth**          | JWT (HS256) + refresh tokens + API tokens + RBAC              |
| **Multi-tenant**  | Optional tenant isolation for SaaS                            |
| **Admin UI**      | Modern React dashboard (embedded in binary)                   |
| **Plugin Engine** | JS (QuickJS) / Rhai / Lua (mlua) / WASM (wasmtime)            |
| **Search**        | Full-text search (Tantivy)                                    |
| **Multi-DB**      | SQLite / PostgreSQL / MySQL — zero code changes               |

---

## Quick Start

```bash
# Clone
git clone https://github.com/mcms/mcms.git
cd mcms

# Build and run (SQLite, default)
cargo run --features "db-sqlite plugin-all search-tantivy"

# Server starts at http://localhost:9898
# Admin UI at http://localhost:9898/admin
# Swagger at http://localhost:9898/swagger-ui
```

### First run

On first startup, mcms automatically:

1. Creates all database tables
2. Seeds default roles, permissions, and site options
3. Starts serving API + Admin UI

Create an admin user:

```bash
cargo run -- db seed admin@example.com admin your-password
```

### Docker

```bash
docker build -t mcms .
docker run -p 9898:9898 -v ./data:/app/data mcms
```

---

## Architecture

> **Full reference:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) is the single source of truth for
> system design. It is written so an AI agent (or new contributor) can understand the codebase
> **without re-analyzing the whole tree** — read it first.

The public API surface is a **REST/JSON API** (`/api/v1/...`) plus SSE and optional WebSocket.
There is no GraphQL endpoint.

```
src/
├── main.rs              # CLI entry point
├── server.rs            # HTTP server + route registration
├── lib.rs               # AppState composition
├── handlers/            # Route handlers (thin: extract → service → respond)
├── services/            # Business logic layer
├── models/              # Data structures + SQL queries
├── middleware/           # Auth, rate limiting, CORS, metrics
├── plugins/             # Plugin engine (WASM/JS/Rhai/Lua)
├── content_type/        # Dynamic content type system
├── worker/              # Job queue + cron scheduler
├── db/                  # Connection pool, dialect, schema
├── config/              # Environment-based configuration
├── errors/              # Unified AppError (thiserror)
├── storage/             # File storage (local / S3)
├── search/              # Full-text search (Tantivy)
├── oauth/               # OAuth providers
├── protocols/           # AOP protocol definitions
├── aspects/             # AOP aspect engine
├── export_type.rs       # ts-rs TypeScript type export (feature: export-types)
└── admin_spa.rs         # Embedded Admin UI (rust-embed)

mcms-derive/              # Proc-macro crate: CRUD Where-DSL, schema validation,
                         # #[derive(EventMeta)], #[aspect_service]
```

### Layering

```
Handler → Service → Model (SQL)
                ↘ External: Storage / Cache / Search / EventBus
```

Handlers contain **no business logic**. Services orchestrate models and external services. Models contain only data structures and SQL queries.

---

## Switching Databases

Zero code changes. Just change the feature flag:

```bash
# SQLite (default)
cargo build --features "db-sqlite"

# PostgreSQL
cargo build --features "db-postgres"

# MySQL
cargo build --features "db-mysql"
```

---

## Plugin System

```bash
plugins/
├── my-plugin/
│   ├── plugin.toml      # Manifest
│   ├── main.js          # JavaScript (QuickJS)
│   ├── main.lua         # Lua (mlua)
│   ├── main.rhai        # Rhai
│   └── main.wasm        # WASM (wasmtime)
```

Example `plugin.toml`:

```toml
[plugin]
name = "my-plugin"
version = "0.1.0"
entry = "main.js"

[permissions]
http = ["GET"]
db = ["read"]
hooks = ["post_created", "comment_created"]
```

---

## Configuration

All configuration via environment variables or `.env`:

```bash
# Database
DATABASE_URL=sqlite:./data/mcms.db

# Server
PORT=9898
HOST=0.0.0.0

# Auth
JWT_SECRET=your-secret-key
JWT_ACCESS_TTL=900          # 15 minutes
JWT_REFRESH_TTL=604800      # 7 days

# Storage
STORAGE_DRIVER=local         # local | s3
UPLOAD_DIR=./uploads

# Multi-tenant
BUILTIN_TENANTABLE=false

# Search
SEARCH_DRIVER=tantivy        # tantivy | noop

# Plugins
PLUGIN_DIR=./plugins
PLUGIN_HOT_RELOAD=true
```

---

## Tech Stack

| Layer           | Technology                             |
| --------------- | -------------------------------------- |
| Language        | Rust (edition 2024)                    |
| HTTP Framework  | Axum 0.8                               |
| Database        | SQLx 0.8 (SQLite / PostgreSQL / MySQL) |
| Auth            | JWT (HS256) + Argon2                   |
| Search          | Tantivy                                |
| Plugin Runtime  | wasmtime / rquickjs / mlua / rhai      |
| Admin UI        | React 19 + Vite + shadcn/ui            |
| Desktop         | Tauri                                  |
| Embedded Assets | rust-embed                             |

---

## Project Status

| Component                        | Status       |
| -------------------------------- | ------------ |
| Core API                         | ✅ Working   |
| Admin UI                         | ✅ Working   |
| Auth (JWT + OAuth + API Token)   | ✅ Working   |
| Multi-database                   | ✅ Working   |
| Plugin engine (JS/Rhai/Lua/WASM) | ✅ Working   |
| Content Type system              | ✅ Working   |
| Job queue + Cron                 | ✅ Working   |
| Tauri desktop                    | ✅ Working   |
| AOP aspects                      | ✅ Working   |
| Serverless adapter               | 🔧 In design |
| Plugin marketplace               | 📋 Planned   |
