import { http, HttpResponse } from "msw";
import {
  audit, categories, comments, contentTypes, cronLogs, crons, cmsRecords, media,
  nid, now, options, pages, plugins, posts, pushRevision, reusableBlocks, revisions,
  roles, tags, tenants, tokens, users, webhooks, workflowInstances, workflows,
  Store, type Row,
} from "./db";

/**
 * MSW 2.15 in Node does not resolve relative handler paths (no location.origin),
 * so tests use an absolute base; the browser worker keeps the origin-relative one.
 */
const B = typeof window === "undefined" ? "http://localhost/api/v1" : "/api/v1";

const ok = (data: unknown) => HttpResponse.json({ code: 0, message: "ok", data });
const fail = (status: number, message: string) => HttpResponse.json({ code: status, message }, { status });

const pageParams = (request: Request) => {
  const u = new URL(request.url);
  return {
    page: Number(u.searchParams.get("page") ?? 1) || 1,
    pageSize: Number(u.searchParams.get("page_size") ?? 20) || 20,
    search: u.searchParams.get("search") ?? "",
  };
};

/** generic RESTful CRUD handlers for a store (list/get/create/update/delete/batch) */
function crud(base: string, store: Store<any>, searchKeys: string[]) {
  return [
    http.get(base, ({ request }) => {
      const { page, pageSize, search } = pageParams(request);
      return ok(store.list({ page, pageSize, search, searchKeys }));
    }),
    http.post(base, async ({ request }) => ok(store.create((await request.json()) as Row))),
    http.get(`${base}/:id`, ({ params }) => {
      const row = store.get(params.id as string);
      return row ? ok(row) : fail(404, "not found");
    }),
    http.put(`${base}/:id`, async ({ params, request }) => {
      const row = store.update(params.id as string, (await request.json()) as Row);
      return row ? ok(row) : fail(404, "not found");
    }),
    http.delete(`${base}/:id`, ({ params }) =>
      store.delete(params.id as string) ? ok(null) : fail(404, "not found"),
    ),
    http.post(`${base}/batch`, async ({ request }) => {
      const { action, ids } = (await request.json()) as { action: string; ids: (string | number)[] };
      return ok({ affected: action === "delete" ? store.batchDelete(ids) : 0 });
    }),
  ];
}

/** deterministic pseudo-random trend series */
function trends(table: string, days: number) {
  const out: Array<{ date: string; count: number }> = [];
  let s = [...table].reduce((a, c) => a + c.charCodeAt(0), 7);
  for (let i = days - 1; i >= 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: s % 12 });
  }
  return out;
}

const adminUser = {
  id: 1, username: "admin", email: "admin@raisfast.dev", role: "admin",
  avatar: "", bio: "Mock administrator", created_at: new Date(Date.now() - 60 * 864e5).toISOString(),
};

export const handlers = [
  /* --------------------------------- setup --------------------------------- */
  http.get(`${B}/setup/status`, () =>
    ok({
      database: { db_type: "sqlite", connected: true, url_masked: "data/raisfast.db", host: null, port: null, username: null, database: null },
      storage: { writable: true, path: "storage" },
      extensions: { writable: true, content_types_path: "extensions/content_types" },
      has_admin: true,
    }),
  ),
  http.post(`${B}/setup/database/test`, () => ok({ success: true, message: "Connection successful" })),
  http.post(`${B}/setup/database`, () => ok({ saved: true })),
  http.post(`${B}/setup/init`, () => ok({ created: true })),

  http.get(`${B}/info`, () =>
    ok({ name: "RaisFast (mock)", version: "0.0.0-mock", tenantable: true, features: { tenant: true } }),
  ),
  http.get(`${B}/options/public`, () => ok({ site_name: "RaisFast Demo" })),

  /* ---------------------------------- auth --------------------------------- */
  http.post(`${B}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (!body.email) return fail(422, "email and password are required");
    return ok({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      user: { ...adminUser, email: body.email },
    });
  }),
  http.post(`${B}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; email?: string };
    return ok({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      user: { ...adminUser, id: nid(), username: body.username ?? "user", email: body.email ?? "", role: "user" },
    });
  }),
  http.post(`${B}/auth/refresh`, () =>
    ok({ access_token: "mock-access-token-2", refresh_token: "mock-refresh-token-2", expires_in: 3600, user: adminUser }),
  ),
  http.post(`${B}/auth/logout`, () => ok(null)),
  http.get(`${B}/auth/config`, () => ok({ registration_enabled: true, oauth_providers: ["github", "google"] })),
  http.get(`${B}/auth/oauth/providers`, () => ok(["github", "google"])),
  http.get(`${B}/auth/oauth/bindings`, () => ok([{ provider: "github", username: "mock-gh" }])),
  http.get(`${B}/auth/credentials`, () => ok([{ id: 1, type: "email", email: adminUser.email }])),

  /* ---------------------------------- users -------------------------------- */
  http.get(`${B}/users/me`, () => ok(adminUser)),
  http.put(`${B}/users/me`, async ({ request }) => ok({ ...adminUser, ...((await request.json()) as object) })),
  http.put(`${B}/users/me/password`, () => ok(null)),
  http.get(`${B}/users/:id`, ({ params }) => {
    const u = users.get(params.id as string);
    return u ? ok(u) : fail(404, "not found");
  }),

  /* ---------------------------------- stats -------------------------------- */
  http.get(`${B}/admin/stats`, () =>
    ok({
      total_posts: posts.items.length,
      total_users: users.items.length,
      total_media: media.items.length,
      total_comments: comments.items.length,
      total_categories: categories.items.length,
      total_tags: tags.items.length,
      total_pages: pages.items.length,
      comments_by_status: comments.items.reduce<Record<string, number>>((acc, c) => {
        acc[c.status ?? "pending"] = (acc[c.status ?? "pending"] ?? 0) + 1;
        return acc;
      }, {}),
      recent_activity: audit.items.slice(0, 6).map((a) => ({ type: a.action, created_at: a.created_at })),
    }),
  ),
  http.get(`${B}/admin/stats/trends`, ({ request }) => {
    const u = new URL(request.url);
    return ok({ data: trends(u.searchParams.get("table") ?? "posts", Number(u.searchParams.get("days") ?? 30) || 30) });
  }),
  http.get(`${B}/admin/stats/content/:type`, () => ok({})),

  /* ------------------------------- CMS basics ------------------------------ */
  ...crud(`${B}/admin/posts`, posts, ["title", "slug"]),
  ...crud(`${B}/admin/categories`, categories, ["name"]),
  ...crud(`${B}/admin/tags`, tags, ["name"]),
  ...crud(`${B}/admin/comments`, comments, ["content", "author_name"]),
  ...crud(`${B}/admin/pages`, pages, ["title", "slug"]),
  ...crud(`${B}/admin/reusable-blocks`, reusableBlocks, ["name", "key"]),
  ...crud(`${B}/admin/users`, users, ["username", "email"]),
  ...crud(`${B}/admin/tenants`, tenants, ["name", "slug"]),
  ...crud(`${B}/admin/webhooks`, webhooks, ["name", "url"]),

  /* ---------------------------------- media -------------------------------- */
  http.get(`${B}/admin/media`, ({ request }) => {
    const { page, pageSize, search } = pageParams(request);
    return ok(media.list({ page, pageSize, search, searchKeys: ["original_name", "filename"] }));
  }),
  http.post(`${B}/admin/media/upload`, async ({ request }) => {
    const fd = await request.formData();
    const file = fd.get("file") as File | null;
    const isImage = (file?.type ?? "").startsWith("image/");
    return ok(
      media.create({
        filename: file?.name ?? "upload.bin",
        original_name: file?.name ?? "upload.bin",
        path: isImage ? `https://picsum.photos/seed/upload-${nid()}/400/300` : `/storage/${file?.name ?? "file"}`,
        mime_type: file?.type || "application/octet-stream",
        size: file?.size ?? 0,
      } as any),
    );
  }),
  http.get(`${B}/admin/media/:id`, ({ params }) => {
    const m = media.get(params.id as string);
    return m ? ok(m) : fail(404, "not found");
  }),
  http.delete(`${B}/admin/media/:id`, ({ params }) => (media.delete(params.id as string) ? ok(null) : fail(404, "not found"))),
  http.post(`${B}/admin/media/batch`, async ({ request }) => {
    const { action, ids } = (await request.json()) as { action: string; ids: (string | number)[] };
    return ok({ affected: action === "delete" ? media.batchDelete(ids) : 0 });
  }),

  /* ------------------------------ content types ----------------------------- */
  http.get(`${B}/admin/content-types`, () => ok(contentTypes.items)),
  http.post(`${B}/admin/content-types`, async ({ request }) => {
    const ct = contentTypes.create((await request.json()) as Row);
    if (!cmsRecords.has(ct.singular)) cmsRecords.set(ct.singular, new Store<Row>([]));
    return ok(ct);
  }),
  http.get(`${B}/admin/content-types/:id`, ({ params }) => {
    const ct = contentTypes.get(params.id as string) ?? contentTypes.items.find((c) => c.singular === params.id);
    return ct ? ok(ct) : fail(404, "not found");
  }),
  http.put(`${B}/admin/content-types/:id`, async ({ params, request }) => {
    const ct = contentTypes.update(params.id as string, (await request.json()) as Row);
    return ct ? ok(ct) : fail(404, "not found");
  }),
  http.delete(`${B}/admin/content-types/:id`, ({ params }) =>
    contentTypes.delete(params.id as string) ? ok(null) : fail(404, "not found"),
  ),

  /* ------------------------- dynamic collections (cms) ----------------------- */
  http.get(`${B}/admin/cms/:name/:id/revisions`, ({ params }) => {
    const arr = revisions.get(`${params.name}:${params.id}`) ?? [
      { id: nid(), revision: 1, created_at: now(), editor: "admin" },
    ];
    return ok({ items: [...arr].reverse(), total: arr.length, page: 1, page_size: arr.length });
  }),
  http.post(`${B}/admin/cms/:name/:id/revisions/:rev/restore`, ({ params }) => {
    const store = cmsRecords.get(params.name as string);
    const row = store?.get(params.id as string);
    return row ? ok(row) : fail(404, "not found");
  }),
  http.get(`${B}/admin/cms/:name/:id/revisions/:a/diff/:b`, () => ok({ added: [], removed: [], changed: [] })),
  http.get(`${B}/admin/cms/:name`, ({ params, request }) => {
    const store = cmsRecords.get(params.name as string);
    if (!store) return fail(404, `unknown collection: ${params.name}`);
    const { page, pageSize, search } = pageParams(request);
    return ok(store.list({ page, pageSize, search, searchKeys: ["title", "question"] }));
  }),
  http.post(`${B}/admin/cms/:name`, async ({ params, request }) => {
    const store = cmsRecords.get(params.name as string);
    if (!store) return fail(404, `unknown collection: ${params.name}`);
    const row = store.create((await request.json()) as Row);
    pushRevision(params.name as string, row);
    return ok(row);
  }),
  http.get(`${B}/admin/cms/:name/:id`, ({ params }) => {
    const row = cmsRecords.get(params.name as string)?.get(params.id as string);
    return row ? ok(row) : fail(404, "not found");
  }),
  http.put(`${B}/admin/cms/:name/:id`, async ({ params, request }) => {
    const row = cmsRecords.get(params.name as string)?.update(params.id as string, (await request.json()) as Row);
    if (!row) return fail(404, "not found");
    pushRevision(params.name as string, row);
    return ok(row);
  }),
  http.delete(`${B}/admin/cms/:name/:id`, ({ params }) =>
    cmsRecords.get(params.name as string)?.delete(params.id as string) ? ok(null) : fail(404, "not found"),
  ),


  /* ---------------------------------- rbac ---------------------------------- */
  http.get(`${B}/admin/rbac/roles`, () => ok(roles.items)),
  http.post(`${B}/admin/rbac/roles`, async ({ request }) => ok(roles.create((await request.json()) as Row))),
  http.put(`${B}/admin/rbac/roles/:id`, async ({ params, request }) => {
    const r = roles.update(params.id as string, (await request.json()) as Row);
    return r ? ok(r) : fail(404, "not found");
  }),
  http.delete(`${B}/admin/rbac/roles/:id`, ({ params }) => (roles.delete(params.id as string) ? ok(null) : fail(404, "not found"))),
  http.get(`${B}/admin/rbac/roles/:id/permissions`, ({ params }) => ok(roles.get(params.id as string)?.permissions ?? [])),
  http.put(`${B}/admin/rbac/roles/:id/permissions`, async ({ params, request }) => {
    const { permissions } = (await request.json()) as { permissions: string[] };
    const r = roles.update(params.id as string, { permissions } as any);
    return r ? ok(r.permissions) : fail(404, "not found");
  }),

  /* ---------------------------------- crons --------------------------------- */
  http.get(`${B}/admin/crons/logs`, ({ request }) => {
    const u = new URL(request.url);
    const cronId = u.searchParams.get("cron_id");
    const { page, pageSize } = pageParams(request);
    return ok(
      cronLogs.list({
        page,
        pageSize,
        extraFilter: cronId ? (l) => String(l.cron_id) === cronId : undefined,
      }),
    );
  }),
  http.post(`${B}/admin/crons/logs/cleanup`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { cron_id?: string };
    const before = cronLogs.items.length;
    cronLogs.items = body.cron_id ? cronLogs.items.filter((l) => String(l.cron_id) !== String(body.cron_id)) : [];
    return ok({ removed: before - cronLogs.items.length });
  }),
  http.post(`${B}/admin/crons/:id/toggle`, ({ params }) => {
    const job = crons.get(params.id as string);
    if (!job) return fail(404, "not found");
    return ok(crons.update(params.id as string, { enabled: !job.enabled } as any));
  }),
  ...crud(`${B}/admin/crons`, crons, ["name", "command"]),

  /* ---------------------------------- tokens -------------------------------- */
  http.get(`${B}/tokens`, ({ request }) => {
    const { page, pageSize, search } = pageParams(request);
    return ok(tokens.list({ page, pageSize, search, searchKeys: ["name"] }));
  }),
  http.post(`${B}/tokens`, async ({ request }) => {
    const body = (await request.json()) as Row;
    const prefix = `rf_${String(body.name ?? "tok").slice(0, 3).toLowerCase()}_${Math.random().toString(36).slice(2, 6)}`;
    const row = tokens.create({ ...body, token_prefix: prefix });
    // the secret is returned exactly once, at creation (as in the real backend)
    return ok({ ...row, token: `${prefix}${Math.random().toString(36).slice(2)}` });
  }),
  http.delete(`${B}/tokens/:id`, ({ params }) => (tokens.delete(params.id as string) ? ok(null) : fail(404, "not found"))),

  /* --------------------------------- workflows ------------------------------- */
  http.get(`${B}/admin/workflows/instances`, ({ request }) => {
    const { page, pageSize } = pageParams(request);
    return ok(workflowInstances.list({ page, pageSize }));
  }),
  http.get(`${B}/admin/workflows/instances/:id`, ({ params }) => {
    const inst = workflowInstances.get(params.id as string);
    return inst ? ok(inst) : fail(404, "not found");
  }),
  http.post(`${B}/admin/workflows/instances/:id/execute`, ({ params }) => {
    const inst = workflowInstances.get(params.id as string);
    return inst ? ok(workflowInstances.update(inst.id, { current_step: "done", status: "completed" } as any)) : fail(404, "not found");
  }),
  http.post(`${B}/admin/workflows/instances/:id/cancel`, ({ params }) => {
    const inst = workflowInstances.get(params.id as string);
    return inst ? ok(workflowInstances.update(inst.id, { status: "cancelled" } as any)) : fail(404, "not found");
  }),
  http.get(`${B}/admin/workflows/instances/:id/logs`, ({ params }) =>
    ok([
      { step: "step-1", status: "success", started_at: now(), duration_ms: 12 },
      { step: "task-1", status: params.id === "inst-1002" ? "running" : "success", started_at: now(), duration_ms: 240 },
    ]),
  ),
  http.post(`${B}/admin/workflows/:id/start`, ({ params }) => {
    const wf = workflows.get(params.id as string);
    if (!wf) return fail(404, "not found");
    const inst = workflowInstances.create({
      id: `inst-${nid()}`, workflow_id: wf.id, workflow_name: wf.name,
      status: "running", current_step: "step-1", started_at: now(),
    } as Row);
    return ok(inst);
  }),
  ...crud(`${B}/admin/workflows`, workflows, ["name", "description"]),

  /* ---------------------------------- audit --------------------------------- */
  http.get(`${B}/admin/audit`, ({ request }) => {
    const { page, pageSize, search } = pageParams(request);
    return ok(audit.list({ page, pageSize, search, searchKeys: ["action", "actor"] }));
  }),
  http.get(`${B}/admin/audit/:id`, ({ params }) => {
    const a = audit.get(params.id as string);
    return a ? ok(a) : fail(404, "not found");
  }),

  /* --------------------------------- options -------------------------------- */
  http.get(`${B}/admin/options`, ({ request }) => {
    const { page, pageSize, search } = pageParams(request);
    return ok(options.list({ page, pageSize, search, searchKeys: ["key"] }));
  }),
  http.get(`${B}/admin/options/:key`, ({ params }) => {
    const o = options.items.find((x) => x.key === params.key);
    return o ? ok(o) : fail(404, "not found");
  }),
  http.put(`${B}/admin/options/:key`, async ({ params, request }) => {
    const { value } = (await request.json()) as { value: unknown };
    const existing = options.items.find((x) => x.key === params.key);
    if (existing) {
      existing.value = value;
      existing.updated_at = now();
      return ok(existing);
    }
    return ok(options.create({ key: params.key as string, value } as any));
  }),
  http.delete(`${B}/admin/options/:key`, ({ params }) => {
    const o = options.items.find((x) => x.key === params.key);
    return o && options.delete(o.id) ? ok(null) : fail(404, "not found");
  }),

  /* ----------------------------------- misc --------------------------------- */
  http.get(`${B}/routes`, (): any => ok(handlers.length)),
  http.get(`${B}/health`, () => ok({ status: "ok" })),
];
