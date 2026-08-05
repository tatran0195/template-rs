import { qs } from "@/lib/utils";
import { http, type HttpClient, type RequestOptions } from "./client";
import type {
  ApiToken, AuditEntry, ContentType, CronJob, MediaItem, OptionEntry, Paginated,
  Plugin, RoleDef, SetupStatus, StatsOverview, Tenant, TokenBundle, TrendPoint,
  User, Webhook, WorkflowDef, WorkflowInstance, Post, Page,
} from "./types";

/* ---------------------------------- auth ---------------------------------- */

class AuthResource {
  constructor(private http: HttpClient) {}
  login(email: string, password: string) {
    return this.http.post<TokenBundle>("/auth/login", { email, password });
  }
  register(body: { username: string; email: string; password: string }) {
    return this.http.post<TokenBundle>("/auth/register", body);
  }
  logout() {
    return this.http.post("/auth/logout").catch(() => null);
  }
  getConfig() {
    return this.http.get("/auth/config");
  }
  getMe() {
    return this.http.get<User>("/users/me");
  }
  updateMe(body: Partial<User>) {
    return this.http.request<User>(this.http.pathForUpdate("/users", "me"), {
      method: this.http.methodForUpdate(),
      body,
    });
  }
  changePassword(body: { old_password: string; new_password: string }) {
    return this.http.request(this.http.pathForUpdate("/users", "me/password"), {
      method: this.http.methodForUpdate(),
      body,
    });
  }
  requestPasswordReset(email: string) {
    return this.http.post("/auth/forgot-password", { email });
  }
  confirmPasswordReset(body: { token: string; password: string }) {
    return this.http.post("/auth/reset-password", body);
  }
  listOAuthProviders() {
    return this.http.get("/auth/oauth/providers");
  }
  listOAuthBindings() {
    return this.http.get("/auth/oauth/bindings");
  }
  listCredentials() {
    return this.http.get("/auth/credentials");
  }
}

/* --------------------------------- setup ---------------------------------- */
/* Setup endpoints are unauthenticated; the recovered UI calls them via fetch. */

const API_BASE = "/api/v1";

export const setupApi = {
  async status(): Promise<SetupStatus> {
    const r = await fetch(`${API_BASE}/setup/status`);
    const j = await r.json();
    return j.data ?? j;
  },
  async testDatabase(body: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    const r = await fetch(`${API_BASE}/setup/database/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    return j.data ?? j;
  },
  async saveDatabase(body: Record<string, unknown>) {
    const r = await fetch(`${API_BASE}/setup/database`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.code !== 0) throw new Error(j.message ?? "Failed to save database configuration");
    return j.data ?? j;
  },
  async init(body: { username: string; email: string; password: string }) {
    const r = await fetch(`${API_BASE}/setup/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.code !== 0) throw new Error(j.message ?? "Failed to create admin account");
    return j.data ?? j;
  },
};

/* ------------------------------ base resource ----------------------------- */

abstract class CrudResource<T = any> {
  protected abstract base: string;
  constructor(protected http: HttpClient) {}

  list(page = 1, pageSize = 25, extra?: Record<string, unknown>, opts?: RequestOptions) {
    return this.http.get<Paginated<T>>(this.base, {
      ...opts,
      query: qs({ page, page_size: pageSize, ...extra }),
    });
  }
  get(id: string | number, opts?: RequestOptions) {
    return this.http.get<T>(`${this.base}/${id}`, opts);
  }
  create(body: Partial<T>, opts?: RequestOptions) {
    return this.http.request<T>(this.http.pathForCreate(this.base), {
      ...opts,
      method: this.http.methodForCreate(),
      body,
    });
  }
  update(id: string | number, body: Partial<T>, opts?: RequestOptions) {
    return this.http.request<T>(this.http.pathForUpdate(this.base, id), {
      ...opts,
      method: this.http.methodForUpdate(),
      body,
    });
  }
  delete(id: string | number, opts?: RequestOptions) {
    return this.http.request(this.http.pathForDelete(this.base, id), {
      ...opts,
      method: this.http.methodForDelete(),
    });
  }
  batch(body: { action: string; ids: (string | number)[] }, opts?: RequestOptions) {
    return this.http.post(`${this.base}/batch`, body, opts);
  }
}

/* ------------------------------ admin resources ---------------------------- */

class AdminPosts extends CrudResource<Post> { protected base = "/admin/posts"; }
class AdminCategories extends CrudResource { protected base = "/admin/categories"; }
class AdminTags extends CrudResource { protected base = "/admin/tags"; }

class AdminComments extends CrudResource {
  protected base = "/admin/comments";
  updateStatus(id: string | number, status: string) {
    return this.http.request(this.http.pathForUpdate(this.base, id), {
      method: this.http.methodForUpdate(),
      body: { status },
    });
  }
}

class AdminPages extends CrudResource<Page> {
  protected base = "/admin/pages";
  reorder(ids: (string | number)[]) {
    return this.http.request(this.http.pathForUpdate(this.base, "reorder"), {
      method: this.http.methodForUpdate(),
      body: { ids },
    });
  }
}

class AdminReusableBlocks extends CrudResource { protected base = "/admin/reusable-blocks"; }

class AdminMedia {
  constructor(private http: HttpClient) {}
  upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return this.http.request<MediaItem>("/admin/media/upload", { method: "POST", body: fd });
  }
  list(page = 1, pageSize = 24, extra?: Record<string, unknown>) {
    return this.http.get<Paginated<MediaItem>>("/admin/media", {
      query: qs({ page, page_size: pageSize, ...extra }),
    });
  }
  get(id: string | number) {
    return this.http.get<MediaItem>(`/admin/media/${id}`);
  }
  delete(id: string | number) {
    return this.http.request(this.http.pathForDelete("/admin/media", id), {
      method: this.http.methodForDelete(),
    });
  }
  batch(body: { action: string; ids: (string | number)[] }) {
    return this.http.post("/admin/media/batch", body);
  }
  getFileURL(path?: string | null) {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("/")) return path;
    return `${this.http.baseUrl.replace(/\/api\/v\d+\/?$/, "")}/${path}`;
  }
}

class AdminContentTypes extends CrudResource<ContentType> { protected base = "/admin/content-types"; }

/** Dynamic collections over /admin/cms/{name} — with revisions support. */
class DynamicCollection<T = any> {
  private prefix: string;
  constructor(private http: HttpClient, public name: string, admin = true) {
    this.prefix = admin ? `/admin/cms/${name}` : `/cms/${name}`;
  }
  getList(page = 1, pageSize = 25, extra?: Record<string, unknown>) {
    return this.http.get<Paginated<T>>(this.prefix, {
      query: qs({ page, page_size: pageSize, ...extra }),
    });
  }
  getOne(id: string | number) {
    return this.http.get<T>(`${this.prefix}/${id}`);
  }
  create(body: Partial<T>) {
    return this.http.request<T>(this.http.pathForCreate(this.prefix), {
      method: this.http.methodForCreate(),
      body,
    });
  }
  update(id: string | number, body: Partial<T>) {
    return this.http.request<T>(this.http.pathForUpdate(this.prefix, id), {
      method: this.http.methodForUpdate(),
      body,
    });
  }
  delete(id: string | number) {
    return this.http.request(this.http.pathForDelete(this.prefix, id), {
      method: this.http.methodForDelete(),
    });
  }
  listRevisions(id: string | number) {
    return this.http.get<Paginated<any>>(`/admin/cms/${this.name}/${id}/revisions`);
  }
  getRevision(id: string | number, rev: string | number) {
    return this.http.get(`/admin/cms/${this.name}/${id}/revisions/${rev}`);
  }
  restoreRevision(id: string | number, rev: string | number) {
    return this.http.post(`/admin/cms/${this.name}/${id}/revisions/${rev}/restore`);
  }
  diffRevisions(id: string | number, a: string | number, b: string | number) {
    return this.http.get(`/admin/cms/${this.name}/${id}/revisions/${a}/diff/${b}`);
  }
}

class AdminUsers extends CrudResource<User> { protected base = "/admin/users"; }

class AdminRbac {
  constructor(private http: HttpClient) {}
  listRoles() {
    return this.http.get<RoleDef[]>("/admin/rbac/roles");
  }
  createRole(body: Partial<RoleDef>) {
    return this.http.request<RoleDef>(this.http.pathForCreate("/admin/rbac/roles"), {
      method: this.http.methodForCreate(),
      body,
    });
  }
  updateRole(id: string | number, body: Partial<RoleDef>) {
    return this.http.request<RoleDef>(this.http.pathForUpdate("/admin/rbac/roles", id), {
      method: this.http.methodForUpdate(),
      body,
    });
  }
  deleteRole(id: string | number) {
    return this.http.request(this.http.pathForDelete("/admin/rbac/roles", id), {
      method: this.http.methodForDelete(),
    });
  }
  getPermissions(id: string | number) {
    return this.http.get<string[]>(`/admin/rbac/roles/${id}/permissions`);
  }
  setPermissions(id: string | number, permissions: string[]) {
    return this.http.request(this.http.pathForUpdate(`/admin/rbac/roles/${id}`, "permissions"), {
      method: this.http.methodForUpdate(),
      body: { permissions },
    });
  }
}

class AdminCrons extends CrudResource<CronJob> {
  protected base = "/admin/crons";
  toggle(id: string | number) {
    return this.http.post(`/admin/crons/${id}/toggle`);
  }
  listLogs(page = 1, pageSize = 20, extra?: Record<string, unknown>) {
    return this.http.get<Paginated<any>>("/admin/crons/logs", {
      query: qs({ page, page_size: pageSize, ...extra }),
    });
  }
  cleanupLogs(body?: Record<string, unknown>) {
    return this.http.post("/admin/crons/logs/cleanup", body);
  }
}

class AdminTenants extends CrudResource<Tenant> { protected base = "/admin/tenants"; }
class AdminWebhooks extends CrudResource<Webhook> { protected base = "/admin/webhooks"; }

class AdminTokens {
  constructor(private http: HttpClient) {}
  list(page = 1, pageSize = 25) {
    return this.http.get<Paginated<ApiToken>>("/tokens", { query: qs({ page, page_size: pageSize }) });
  }
  create(body: { name: string; permissions?: string[]; expires_at?: string }) {
    return this.http.request<ApiToken>(this.http.pathForCreate("/tokens"), {
      method: this.http.methodForCreate(),
      body,
    });
  }
  delete(id: string | number) {
    return this.http.request(this.http.pathForDelete("/tokens", id), {
      method: this.http.methodForDelete(),
    });
  }
}

class AdminWorkflows extends CrudResource<WorkflowDef> {
  protected base = "/admin/workflows";
  start(id: string | number, input?: Record<string, unknown>) {
    return this.http.post(`/admin/workflows/${id}/start`, input);
  }
  listInstances(page = 1, pageSize = 20, extra?: Record<string, unknown>) {
    return this.http.get<Paginated<WorkflowInstance>>("/admin/workflows/instances", {
      query: qs({ page, page_size: pageSize, ...extra }),
    });
  }
  getInstance(id: string | number) {
    return this.http.get<WorkflowInstance>(`/admin/workflows/instances/${id}`);
  }
  executeStep(id: string | number, body?: Record<string, unknown>) {
    return this.http.post(`/admin/workflows/instances/${id}/execute`, body);
  }
  cancelInstance(id: string | number) {
    return this.http.post(`/admin/workflows/instances/${id}/cancel`);
  }
  getStepLogs(id: string | number) {
    return this.http.get(`/admin/workflows/instances/${id}/logs`);
  }
}

class AdminAudit {
  constructor(private http: HttpClient) {}
  list(page = 1, pageSize = 20, extra?: Record<string, unknown>) {
    return this.http.get<Paginated<AuditEntry>>("/admin/audit", {
      query: qs({ page, page_size: pageSize, ...extra }),
    });
  }
  get(id: string | number) {
    return this.http.get<AuditEntry>(`/admin/audit/${id}`);
  }
}

class AdminOptions {
  constructor(private http: HttpClient) {}
  list(page = 1, pageSize = 50, extra?: Record<string, unknown>) {
    return this.http.get<Paginated<OptionEntry>>("/admin/options", {
      query: qs({ page, page_size: pageSize, ...extra }),
    });
  }
  get(key: string) {
    return this.http.get<OptionEntry>(`/admin/options/${key}`);
  }
  set(key: string, value: unknown) {
    return this.http.request(this.http.pathForUpdate("/admin/options", key), {
      method: this.http.methodForUpdate(),
      body: { value },
    });
  }
  delete(key: string) {
    return this.http.request(this.http.pathForDelete("/admin/options", key), {
      method: this.http.methodForDelete(),
    });
  }
  batchUpdate(items: Array<{ key: string; value: unknown }>) {
    return this.http.request(this.http.pathForUpdate("/admin/options", "batch"), {
      method: this.http.methodForUpdate(),
      body: { items },
    });
  }
}

class AdminStats {
  constructor(private http: HttpClient) {}
  overview() {
    return this.http.get<StatsOverview>("/admin/stats");
  }
  content(type: string) {
    return this.http.get(`/admin/stats/content/${type}`);
  }
  trends(table: string, days = 30) {
    return this.http.get<{ data: TrendPoint[] }>("/admin/stats/trends", {
      query: qs({ table, days }),
    });
  }
}

/** Server-sent events channel (recovered: EventSource on /events?filter=…). */
class EventsChannel {
  constructor(private baseUrl: string) {}
  subscribe(filter?: string): EventSource {
    const url = filter
      ? `${this.baseUrl}/events?filter=${encodeURIComponent(filter)}`
      : `${this.baseUrl}/events`;
    return new EventSource(url);
  }
}

/* --------------------------------- facade --------------------------------- */

export const api = {
  auth: new AuthResource(http),
  stats: new AdminStats(http),
  posts: new AdminPosts(http),
  categories: new AdminCategories(http),
  tags: new AdminTags(http),
  comments: new AdminComments(http),
  pages: new AdminPages(http),
  reusableBlocks: new AdminReusableBlocks(http),
  media: new AdminMedia(http),
  contentTypes: new AdminContentTypes(http),
  users: new AdminUsers(http),
  rbac: new AdminRbac(http),
  crons: new AdminCrons(http),
  tenants: new AdminTenants(http),
  webhooks: new AdminWebhooks(http),
  tokens: new AdminTokens(http),
  workflows: new AdminWorkflows(http),
  audit: new AdminAudit(http),
  options: new AdminOptions(http),
  events: new EventsChannel(http.baseUrl),
  collection: (name: string) => new DynamicCollection(http, name, true),
};

export type { RequestOptions };
