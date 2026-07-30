# AGENTS.md

## Project

axe — Rust-powered high-performance BaaS and headless CMS. Single binary, zero dependencies, zero GC. Built-in blog, ecommerce, wallet, payment & multi-tenant SaaS. JS / Rhai / Lua / WASM plugin engines for infinite extensibility.

- **Crate name:** `axe`
- **Rust edition:** 2024
- **Architecture:** Handler → Service → Model three-layer
- **Plugin engines:** JS (QuickJS) / Rhai / Lua (mlua) / WASM (wasmtime)
- **Databases:** SQLite / PostgreSQL / MySQL (feature-gated)

## Environment & First Steps

1. If `cargo` is unavailable, run `./scripts/setup-rust.sh`. The repository's
   `rust-toolchain.toml` selects stable Rust and installs `rustfmt` and `clippy`.
2. Read `docs/ARCHITECTURE.md` before architectural or cross-layer work; it is the
   self-contained system model. Read only the focused module(s) needed for a small change.
3. Never load, print, commit, or alter real secrets. Use `.env.example` as the configuration reference;
   local databases and runtime storage are ignored by Git.
4. Preserve the requested scope. Do not rewrite unrelated code, change feature defaults, or regenerate
   SQLx metadata unless the task specifically requires it.

## Commands

These commands match the CI feature set. `SQLX_OFFLINE=true` uses the checked-in `.sqlx/` metadata,
so no local database is required for normal quality checks.

```bash
# Format check (always run after Rust edits)
cargo fmt --all -- --check

# Lint with warnings treated as errors
SQLX_OFFLINE=true cargo clippy --no-default-features \
  --features "db-sqlite,plugin-all,search-tantivy" -- -D warnings

# Run the full test suite
SQLX_OFFLINE=true cargo test --no-default-features \
  --features "db-sqlite,plugin-all,search-tantivy"

# Optional local server (uses the SQLite development database)
SQLX_OFFLINE=true DATABASE_URL="sqlite:./storage/db/axe.db?mode=rwc" \
  cargo run --no-default-features --features "db-sqlite,plugin-all,search-tantivy"
```

`just` recipes provide shortcuts when `just` is installed (`just qa`, `just test`), but direct Cargo
commands above are the portable baseline.

## Agent Workflow

- State the intended change, inspect the nearest existing implementation and tests, then make the
  smallest coherent edit. Reuse established patterns instead of introducing a parallel abstraction.
- Add or update focused tests whenever behavior changes. Validate with formatting plus the narrowest
  relevant test; run the full commands above when practical. Report commands that could not run and why.
- Treat public REST routes, DTOs, migrations, config keys, feature flags, and plugin interfaces as
  compatibility-sensitive. Do not change them incidentally.
- Update `docs/ARCHITECTURE.md`, `README.md`, or `.env.example` when a change alters architecture,
  user-visible behavior, configuration, or setup. Keep `AGENTS.md` canonical for shared AI guidance;
  `CLAUDE.md` intentionally only points Claude-compatible agents here.

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
- **src/plugins/** — 4-engine plugin system (JS/Rhai/Lua/WASM)
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
  Covers layering, DB/CRUD macros, `axe-derive` code generation, the `export-types` TS SDK, auth,
  plugins, content types, AOP, workers, events, and key invariants.
- **`README.md`** — user-facing overview / quick start.
- **`axe-derive/src/lib.rs`** — authoritative reference for every proc-macro's syntax.

> **API surface:** REST/JSON under `/api/v1/...` + SSE + optional WebSocket. **No GraphQL**
> (the `async-graphql` endpoint was removed).

## Code Generation (`axe-derive`) & Type Export

- `axe-derive/` is the project's own proc-macro crate (required core infra, not optional): `crud_*!`
  Where-DSL SQL macros, `#[derive(EventMeta)]`, `#[aspect_service]`, compile-time `check_schema!`.
- `export-types` (feature flag, off by default) uses `ts-rs` + `export_types!` + `src/export_type.rs` to
  emit a TypeScript SDK: `cargo run --example export-types --features export-types`. This is a *separate*
  system from `axe-derive` — do not conflate the two.

## CRUD Macro System

All DB operations use the Where DSL macro system (`axe-derive`):

- `crud_insert!`, `crud_update!`, `crud_delete!` — write operations
- `crud_find!`, `crud_find_one!`, `crud_find_all!` — read operations
- `crud_find_page!`, `crud_join_paged!` — pagination with JOINs
- `crud_resolve_id!`, `crud_resolve_ids!` — ID resolution
- `in_transaction!` — transaction wrapper (auto-acquires write lock)

## Style

- `cargo fmt` and `cargo clippy` are authoritative.
- Public items require `///` doc comments.
- Handler → Service → Model layering enforced.
