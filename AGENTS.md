# AGENTS.md

## Project

mcms — Rust-powered high-performance BaaS and headless CMS. Single binary, zero dependencies, zero GC. Built-in blog, ecommerce, wallet, payment & multi-tenant SaaS.

- **Crate name:** `mcms`
- **Rust edition:** 2024
- **Architecture:** Handler → Service → Model three-layer
- **Databases:** SQLite / PostgreSQL / MySQL (feature-gated)

## Commands

```bash
# Compile (SQLite)
SQLX_OFFLINE=false DATABASE_URL="sqlite:./storage/db/mcms.db?mode=rwc" \
  cargo clippy --tests --no-default-features \
  --features "db-sqlite" -- -D warnings

# Test
SQLX_OFFLINE=false DATABASE_URL="sqlite:./storage/db/mcms.db?mode=rwc" \
  cargo test --no-default-features \
  --features "db-sqlite"

# Format check
cargo fmt --check
```

## Architecture

```
Handler → Service → Model (SQL)
                ↘ External: Storage / Cache / Search / EventBus
```

- **src/handlers/** — axum route handlers (thin: extract params, call service, return response)
  - Handler layer is the **only** auth entry point (`ensure_*` calls)
- **src/services/** — business logic layer
  - Service layer does **Policy only** (resource ownership checks), never calls `ensure_*`
- **src/models/** — data structures and DB queries (sqlx + CRUD macros)
  - Model provides `tx_*` variants for transaction participation
- **src/middleware/** — JWT auth, rate limiting
- **src/errors/** — unified `AppError` (thiserror) implementing `IntoResponse`
- **src/config/** — env/config loading
- **src/db/** — connection pool, SQL dialect, schema, write lock
- **src/content_type/** — dynamic content type system
- **src/worker/** — job queue + cron scheduler (infrastructure, not model layer)

## Key Constraints

- **`unsafe` is banned.** `#![deny(unsafe_code)]` at crate root.
- **No `unwrap()` / `expect()`** in non-test code. Use `?` or explicit error handling.
- **Error handling:** `thiserror` for `AppError` at handler boundaries; `anyhow` for internal service propagation.
- **Database:** SQLite via sqlx. All timestamps as TEXT in ISO 8601.
- **Primary keys:** Snowflake ID (ferroid) with multiplicative inverse cipher + base62 encoding.
- **Auth:** JWT (HS256) with short-lived access tokens + DB-stored refresh tokens.
- **Write lock:** All transactions go through `acquire_write()` (tokio Mutex) to serialize SQLite writes and eliminate `SQLITE_BUSY` tail latency.

## Documentation Map

- **`docs/ARCHITECTURE.md`** — full system design; read it first to avoid re-analyzing the whole tree.
  Covers layering, DB/CRUD macros, `mcms-derive` code generation, the `export-types` TS SDK, auth,
  content types, AOP, workers, events, and key invariants.
- **`README.md`** — user-facing overview / quick start.
- **`mcms-derive/src/lib.rs`** — authoritative reference for every proc-macro's syntax.

> **API surface:** REST/JSON under `/api/v1/...` + SSE + optional WebSocket. **No GraphQL**
> (the `async-graphql` endpoint was removed).

## Code Generation (`mcms-derive`) & Type Export

- `mcms-derive/` is the project's own proc-macro crate (required core infra, not optional): `crud_*!`
  Where-DSL SQL macros, `#[derive(EventMeta)]`, `#[aspect_service]`, compile-time `check_schema!`.
- `export-types` (feature flag, off by default) uses `ts-rs` + `export_types!` + `src/export_type.rs` to
  emit a TypeScript SDK: `cargo run --example export-types --features export-types`. This is a _separate_
  system from `mcms-derive` — do not conflate the two.

## CRUD Macro System

All DB operations use the Where DSL macro system (`mcms-derive`):

- `crud_insert!`, `crud_update!`, `crud_delete!` — write operations
- `crud_find!`, `crud_find_one!`, `crud_find_all!` — read operations
- `crud_find_page!`, `crud_join_paged!` — pagination with JOINs
- `crud_resolve_id!`, `crud_resolve_ids!` — ID resolution
- `in_transaction!` — transaction wrapper (auto-acquires write lock)

## Style

- `cargo fmt` and `cargo clippy` are authoritative.
- Public items require `///` doc comments.
- Handler → Service → Model layering enforced.
