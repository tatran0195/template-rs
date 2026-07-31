import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server } from "./node";

const B = "http://localhost/api/v1";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const get = async (path: string) => (await fetch(`${B}${path}`)).json();
const send = async (method: string, path: string, body?: unknown) =>
  (
    await fetch(`${B}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  ).json();

describe("envelope & setup", () => {
  it("wraps responses in {code:0, data}", async () => {
    const j = await get("/setup/status");
    expect(j.code).toBe(0);
    expect(j.data.has_admin).toBe(true);
    expect(j.data.database.connected).toBe(true);
  });

  it("site info advertises multi-tenancy", async () => {
    const j = await get("/info");
    expect(j.data.tenantable).toBe(true);
  });
});

describe("auth", () => {
  it("login returns a token bundle with admin user", async () => {
    const j = await send("POST", "/auth/login", { email: "admin@raisfast.dev", password: "secret" });
    expect(j.code).toBe(0);
    expect(j.data.access_token).toBeTruthy();
    expect(j.data.refresh_token).toBeTruthy();
    expect(j.data.user.role).toBe("admin");
  });

  it("login without email is rejected", async () => {
    const res = await fetch(`${B}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(422);
  });

  it("refresh issues new tokens", async () => {
    const j = await send("POST", "/auth/refresh", { refresh_token: "x" });
    expect(j.data.access_token).toContain("mock-access-token");
  });

  it("users/me returns the admin", async () => {
    const j = await get("/users/me");
    expect(j.data.username).toBe("admin");
  });
});

describe("generic CRUD (posts)", () => {
  it("lists with pagination + envelope", async () => {
    const j = await get("/admin/posts?page=1&page_size=2");
    expect(j.data.items).toHaveLength(2);
    expect(j.data.total).toBeGreaterThanOrEqual(3);
    expect(j.data.page).toBe(1);
    expect(j.data.page_size).toBe(2);
  });

  it("searches by title", async () => {
    const j = await get("/admin/posts?search=raisfast");
    expect(j.data.items.length).toBeGreaterThanOrEqual(1);
    expect(j.data.items[0].title.toLowerCase()).toContain("raisfast");
  });

  it("creates, reads, updates, deletes", async () => {
    const created = await send("POST", "/admin/posts", { title: "Test post", status: "draft" });
    expect(created.data.id).toBeTruthy();
    expect(created.data.created_at).toBeTruthy();

    const got = await get(`/admin/posts/${created.data.id}`);
    expect(got.data.title).toBe("Test post");

    const updated = await send("PUT", `/admin/posts/${created.data.id}`, { title: "Renamed" });
    expect(updated.data.title).toBe("Renamed");

    const del = await send("DELETE", `/admin/posts/${created.data.id}`);
    expect(del.code).toBe(0);

    const missing = await get(`/admin/posts/${created.data.id}`);
    expect(missing.code).toBe(404);
  });

  it("batch deletes", async () => {
    const a = await send("POST", "/admin/posts", { title: "A" });
    const b = await send("POST", "/admin/posts", { title: "B" });
    const j = await send("POST", "/admin/posts/batch", { action: "delete", ids: [a.data.id, b.data.id] });
    expect(j.data.affected).toBe(2);
  });
});

describe("comments moderation", () => {
  it("updates status via PUT {status}", async () => {
    const j = await send("PUT", "/admin/comments/2", { status: "approved" });
    expect(j.data.status).toBe("approved");
  });
});

describe("stats (dashboard)", () => {
  it("overview totals reflect the seed data", async () => {
    const j = await get("/admin/stats");
    expect(j.data.total_posts).toBeGreaterThanOrEqual(3);
    expect(j.data.total_users).toBe(4);
    expect(j.data.recent_activity.length).toBeGreaterThan(0);
  });

  it("trends returns one point per day", async () => {
    const j = await get("/admin/stats/trends?table=posts&days=14");
    expect(j.data.data).toHaveLength(14);
    expect(j.data.data[0]).toHaveProperty("date");
    expect(j.data.data[0]).toHaveProperty("count");
  });
});

describe("audit (notification bell source)", () => {
  it("serves page 1 with page_size=20 like the bell requests", async () => {
    const j = await get("/admin/audit?page=1&page_size=20");
    expect(j.code).toBe(0);
    expect(j.data.items.length).toBeGreaterThanOrEqual(8);
    expect(j.data.items[0]).toHaveProperty("action");
    expect(j.data.items[0]).toHaveProperty("created_at");
  });
});

describe("content types & dynamic collections", () => {
  it("lists content types as an array", async () => {
    const j = await get("/admin/content-types");
    expect(Array.isArray(j.data)).toBe(true);
    expect(j.data.map((c: any) => c.singular)).toContain("event");
  });

  it("CRUDs records in /admin/cms/{name}", async () => {
    const created = await send("POST", "/admin/cms/event", { title: "New conf", status: "draft" });
    expect(created.code).toBe(0);

    const list = await get("/admin/cms/event?page=1&page_size=10");
    expect(list.data.total).toBe(4);

    const updated = await send("PUT", `/admin/cms/event/${created.data.id}`, { title: "Renamed conf" });
    expect(updated.data.title).toBe("Renamed conf");
  });

  it("tracks revisions on update and restores", async () => {
    await send("PUT", "/admin/cms/event/1", { title: "Rust meetup #12 (edited)" });
    const revs = await get("/admin/cms/event/1/revisions");
    expect(revs.data.items.length).toBeGreaterThanOrEqual(2);
    expect(revs.data.items[0].revision).toBeGreaterThanOrEqual(2);

    const restore = await send("POST", `/admin/cms/event/1/revisions/1/restore`);
    expect(restore.code).toBe(0);
  });

  it("unknown collection returns code 404", async () => {
    const j = await get("/admin/cms/nope");
    expect(j.code).toBe(404);
  });
});

describe("plugins", () => {
  it("lists plugins with engines", async () => {
    const j = await get("/admin/plugins");
    expect(j.data.map((p: any) => p.engine)).toEqual(expect.arrayContaining(["lua", "js", "wasm"]));
  });

  it("enable/disable toggles the flag", async () => {
    const off = await send("POST", "/admin/plugins/analytics/disable");
    expect(off.data.enabled).toBe(false);
    const on = await send("POST", "/admin/plugins/analytics/enable");
    expect(on.data.enabled).toBe(true);
  });
});

describe("rbac", () => {
  it("gets and sets role permissions", async () => {
    const before = await get("/admin/rbac/roles/3/permissions");
    expect(Array.isArray(before.data)).toBe(true);

    const perms = ["posts:read", "posts:create"];
    const after = await send("PUT", "/admin/rbac/roles/3/permissions", { permissions: perms });
    expect(after.data).toEqual(perms);
  });
});

describe("crons", () => {
  it("toggle flips enabled", async () => {
    const j = await send("POST", "/admin/crons/1/toggle");
    expect(j.data.enabled).toBe(false);
    const back = await send("POST", "/admin/crons/1/toggle");
    expect(back.data.enabled).toBe(true);
  });

  it("logs filter by cron_id and cleanup removes them", async () => {
    const logs = await get("/admin/crons/logs?cron_id=2");
    expect(logs.data.items.every((l: any) => String(l.cron_id) === "2")).toBe(true);

    const cleaned = await send("POST", "/admin/crons/logs/cleanup", { cron_id: 2 });
    expect(cleaned.data.removed).toBeGreaterThanOrEqual(1);

    const after = await get("/admin/crons/logs?cron_id=2");
    expect(after.data.items).toHaveLength(0);
  });
});

describe("workflows", () => {
  it("start creates a running instance; cancel stops it", async () => {
    const started = await send("POST", "/admin/workflows/1/start", {});
    expect(started.data.status).toBe("running");

    const instances = await get("/admin/workflows/instances");
    expect(instances.data.items.some((i: any) => i.id === started.data.id)).toBe(true);

    const cancelled = await send("POST", `/admin/workflows/instances/${started.data.id}/cancel`);
    expect(cancelled.data.status).toBe("cancelled");
  });

  it("serves step logs", async () => {
    const j = await get("/admin/workflows/instances/inst-1002/logs");
    expect(j.code).toBe(0);
    expect(j.data[0]).toHaveProperty("step");
  });
});

describe("tokens & options", () => {
  it("token secret is returned exactly once at creation", async () => {
    const created = await send("POST", "/tokens", { name: "deploy" });
    expect(created.data.token).toMatch(/^rf_dep_/);

    const list = await get("/tokens");
    const row = list.data.items.find((t: any) => t.id === created.data.id);
    expect(row.token).toBeUndefined();
    expect(row.token_prefix).toBeTruthy();
  });

  it("options set creates-or-updates by key", async () => {
    await send("PUT", "/admin/options/site_name", { value: "Renamed Site" });
    const j = await get("/admin/options/site_name");
    expect(j.data.value).toBe("Renamed Site");

    await send("PUT", "/admin/options/brand_new", { value: 42 });
    const n = await get("/admin/options/brand_new");
    expect(n.data.value).toBe(42);
  });
});

describe("media", () => {
  it("upload accepts multipart and returns a stored item", async () => {
    const fd = new FormData();
    fd.append("file", new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" }));
    const res = await fetch(`${B}/admin/media/upload`, { method: "POST", body: fd });
    const j = await res.json();
    expect(j.code).toBe(0);
    expect(j.data.original_name).toBe("photo.jpg");
    expect(j.data.mime_type).toBe("image/jpeg");
  });
});
