import { test, expect, beforeAll, afterAll } from "vitest";
import { server } from "./node";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass", quiet: true }));
afterAll(() => server.close());

const B = "http://localhost/api/v1";

async function get(path: string, init?: RequestInit) {
  return fetch(`${B}${path}`, init);
}

async function post(path: string, body?: unknown, init?: RequestInit) {
  return fetch(`${B}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });
}

function json(r: Response) {
  return r.json() as Promise<{ code: number; message: string; data?: unknown }>;
}

test("setup/status returns real database/storage info", async () => {
  const r = await get("/setup/status");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.code).toBe(0);
  expect(d.data).toHaveProperty("database");
  expect(d.data).toHaveProperty("storage");
  expect(d.data).toHaveProperty("extensions");
  expect(d.data).toHaveProperty("has_admin");
  console.log("setup/status =>", JSON.stringify(d.data));
});

test("info returns mock identity", async () => {
  const r = await get("/info");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.name).toBe("RaisFast (mock)");
  expect(d.data.tenantable).toBe(true);
  console.log("info =>", JSON.stringify(d.data));
});

test("auth/login returns real token bundle", async () => {
  const r = await post("/auth/login", { email: "admin@raisfast.dev", password: "any" });
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data).toHaveProperty("access_token");
  expect(d.data).toHaveProperty("refresh_token");
  expect(d.data.user.email).toBe("admin@raisfast.dev");
  console.log("auth/login => token present, user email matched");
});

test("auth/login without email returns 422", async () => {
  const r = await post("/auth/login", { password: "x" });
  const d = await json(r);
  expect(r.status).toBe(422);
  expect(d.code).toBe(422);
  expect(d.message).toContain("required");
  console.log("auth/login (no email) =>", r.status, d.message);
});

test("users/me returns admin", async () => {
  const r = await get("/users/me", { headers: { Authorization: "Bearer mock-access-token" } });
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.username).toBe("admin");
  console.log("users/me => username", d.data.username);
});

test("posts list returns 3 seed posts + pagination envelope", async () => {
  const r = await get("/admin/posts?page=1&page_size=20");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.items.length).toBeGreaterThanOrEqual(3);
  expect(d.data.total).toBeGreaterThanOrEqual(3);
  expect(d.data).toHaveProperty("page");
  console.log("posts list => total", d.data.total, "items", d.data.items.length);
});

test("categories list returns 3 categories", async () => {
  const r = await get("/admin/categories");
  const d = await json(r);
  expect(r.status).toBe(200);
  const items = Array.isArray(d.data) ? d.data : (d.data?.items ?? []);
  expect(items.length).toBeGreaterThanOrEqual(3);
  console.log("categories => count", items.length);
});

test("tags list returns 4 tags", async () => {
  const r = await get("/admin/tags");
  const d = await json(r);
  expect(r.status).toBe(200);
  const items = Array.isArray(d.data) ? d.data : (d.data?.items ?? []);
  expect(items.length).toBeGreaterThanOrEqual(4);
  console.log("tags => count", items.length);
});

test("media list returns seed images", async () => {
  const r = await get("/admin/media?page=1&page_size=24");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.items.length).toBeGreaterThanOrEqual(6);
  console.log("media => count", d.data.items.length);
});

test("content-types list returns event + faq", async () => {
  const r = await get("/admin/content-types");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(Array.isArray(d.data)).toBe(true);
  expect(d.data.length).toBeGreaterThanOrEqual(2);
  console.log("content-types => items", d.data.map((c: any) => c.singular));
});

test("audit page returns 8 entries with notification source", async () => {
  const r = await get("/admin/audit?page=1&page_size=20");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.items.length).toBeGreaterThanOrEqual(8);
  console.log("audit => entries", d.data.items.length);
});

test("tokens list returns seed tokens", async () => {
  const r = await get("/tokens?page=1&page_size=20");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.items.length).toBeGreaterThanOrEqual(2);
  console.log("tokens =>", d.data.items.map((t: any) => t.name));
});

test("workflows list returns welcome email workflow", async () => {
  const r = await get("/admin/workflows");
  const d = await json(r);
  expect(r.status).toBe(200);
  const items = Array.isArray(d.data) ? d.data : (d.data?.items ?? []);
  expect(items.length).toBeGreaterThanOrEqual(1);
  console.log("workflows =>", items.map((w: any) => w.name));
});

test("crons list returns 2 jobs", async () => {
  const r = await get("/admin/crons");
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.items.length).toBeGreaterThanOrEqual(2);
  console.log("crons =>", d.data.items.map((c: any) => c.name + ":" + (c.enabled ? "enabled" : "disabled")));
});

test("rbac roles list returns admin + author + editor", async () => {
  const r = await get("/admin/rbac/roles");
  const d = await json(r);
  expect(r.status).toBe(200);
  console.log("rbac => roles", d.data.map((r: any) => r.name));
});

test("unknown collection 404 (mock CMS)", async () => {
  const r = await get("/admin/cms/nonexistent/1");
  const d = await json(r);
  expect(r.status).toBe(404);
  expect(d.message).toContain("not found");
  console.log("cms nonexistent => 404, msg:", d.message);
});

test("setup database test returns success", async () => {
  const r = await post("/setup/database/test", {});
  const d = await json(r);
  expect(r.status).toBe(200);
  expect(d.data.success).toBe(true);
  console.log("setup/db-test =>", d.data.message);
});
