# RaisFast Admin (Reverse-Engineered Reimplementation)

A from-scratch rebuild of the [RaisFast](https://github.com/RaisFast/raisfast) admin UI,
recovered from its compiled production bundle (no original source was published).
See `../analysis/REVERSE_ENGINEERING.md` for the forensic write-up.

**Scope:** CMS + platform routes only. E-commerce and payments routes (orders, products,
coupons, shipping, payment channels/orders/transactions, wallets, currencies) are
intentionally omitted per requirements.

## Stack (mirrors the recovered bundle)

| Layer | Original (recovered) | This project |
|---|---|---|
| UI runtime | React 19.2.4 | React 19 |
| Routing | React Router 7.5 | react-router-dom 7 |
| Styling | Tailwind v4 + shadcn/ui tokens | Tailwind v4 + hand-rolled shadcn-style kit (`data-slot` attrs, same CSS vars) |
| Server state | TanStack Query | @tanstack/react-query 5 |
| Client state | zustand persist ×3 stores | zustand persist: `auth-storage`, `tenant-storage`, `i18n-locale` |
| Validation | zod | zod |
| Charts | chart.js | chart.js + react-chartjs-2 |
| Editor | @uiw/react-md-editor | same |
| Workflow editor | @xyflow/react (nodes: step/task/branch/delay/parallel/await) | same |
| Palette/toasts | cmdk, sonner | same |
| i18n | custom dictionaries, 9 locales | same custom system, en + zh shipped (drop-in structure for the other 7) |

## API client fidelity (`src/lib/api/`)

- `{code, message, data}` envelope; `code !== 0` → `ApiError`
- `Authorization: Bearer`, `X-Tenant-ID`, `Accept-Language` headers
- single-flight `POST /auth/refresh` on 401, retry original once, clear store on failure
- dual `restful`/`rpc` `apiStyle` path helpers (`pathForCreate/Update/Delete`)
- keyed `AbortController` cancellation + `beforeSend`/`afterSend` hooks
- dynamic collections: `/admin/cms/{name}` CRUD + revisions (`list/get/diff/restore`)
- SSE: `EventSource` on `/api/v1/events?filter=…`
- setup wizard endpoints: `GET /setup/status`, `POST /setup/database/test`, `POST /setup/database`, `POST /setup/init`
- the notification bell polls `/api/v1/admin/audit?page=1&page_size=20` every 15 s
  and diffs against `notifications_last_seen` — exactly like the original (there is no notifications API)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 — MSW mock backend ON, no raisfast binary needed
```

Sign in with **any email + password** (mock returns an admin token). All data is seeded
in-memory in `src/mocks/db.ts` and resets on page reload.

### Mock backend (MSW)

- `src/mocks/handlers.ts` implements the full API surface the UI consumes:
  setup/status, info, auth (login/register/refresh/logout/me), stats + trends,
  generic CRUD for posts/categories/tags/comments/pages/reusable-blocks/users/
  tenants/webhooks/crons/workflows/tokens, media upload (multipart), content types,
  dynamic `/admin/cms/{name}` collections **with revision tracking**, plugins
  (enable/disable/reload/unload), RBAC roles + permissions, cron logs + cleanup,
  workflow start/instances/cancel/logs, audit, options.
- Responses use the real `{code, message, data}` envelope and `{items, total, page, page_size}`
  pagination, so the UI can't tell the difference.
- Disable it to talk to a real backend: `npm run dev:real`
  (proxies `/api` to `RAISFAST_BACKEND`, default `http://localhost:9898`).

### Tests

```bash
npm test           # vitest + msw/node — 28 tests against the same handlers
```

Covers: envelope shape, setup probe, login/refresh, paginated CRUD + search + batch,
comment moderation, stats/trends, the audit-log notification source, content-type
collections incl. revisions & restore, plugin toggles, RBAC permission set/get,
cron toggle/logs/cleanup, workflow start→instance→cancel, token show-once semantics,
options upsert, multipart upload.

> Gotcha documented for posterity: MSW 2.15 under Node does not resolve relative
> handler paths (no `location.origin`), so `handlers.ts` uses an absolute
> `http://localhost/api/v1` base in Node and the origin-relative base in the browser.

## Route map

```
/auth/login  /auth/user-login  /auth/register  /setup
/dashboard
/posts [/new, /:id/edit]   /categories  /tags  /comments  /media
/pages [/new, /:id/edit]   /reusable-blocks
/content-types [/builder, /:singular, /:singular/new, /:singular/:id/edit]
/plugins [/:id]
/users  /rbac  /crons [/:id]  /tenants  /webhooks  /tokens
/workflows [/editor, /instances]  /audit  /options  /profile
```

## Notable replicas

- **Dashboard**: stat cards from `/admin/stats` (30 s polling), 14-day bar chart of
  posts/comments trends (60 s), recent-activity feed; dark-mode-aware chart colors.
- **Post editor**: markdown editor, auto-slug, status, category, tag chips, SEO fields.
- **Page editor**: block list (type/name/JSON content/reorder) + `reusable` blocks by key.
- **Content-type builder**: full field palette (text…relation) with required/unique,
  enum options, relation targets → dynamic collection CRUD with auto-generated forms
  and a revisions dialog.
- **Workflow editor**: drag-and-drop React Flow canvas, palette = step/task/branch/
  delay/parallel/await, node property panel, saves `{nodes, edges}` definitions;
  instances view with cancel + logs.
- **RBAC**: roles CRUD + permission matrix (`resource:action`).
- **Cron**: list with enable toggle, detail page with run logs + cleanup.
- **Tokens**: create returns the token exactly once in a copy dialog.
