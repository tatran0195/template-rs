/* In-memory mock database for the MSW backend. Self-contained (no @/ imports)
   so it also runs under vitest in Node. */

export interface Row {
  id: number | string;
  [k: string]: any;
}

let seq = 10_000;
export const nid = () => seq++;

export const now = () => new Date().toISOString();
export const daysAgo = (n: number, h = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
};

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  searchKeys?: string[];
  extraFilter?: (r: Row) => boolean;
}

export class Store<T extends Row> {
  items: T[];
  private autoId: number;

  constructor(seed: T[]) {
    this.items = [...seed];
    this.autoId = seed.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
  }

  list({ page = 1, pageSize = 20, search = "", searchKeys = [], extraFilter }: ListQuery = {}) {
    let rows: Row[] = this.items;
    if (extraFilter) rows = rows.filter(extraFilter);
    const s = search.trim().toLowerCase();
    if (s) rows = rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize);
    return { items, total, page, page_size: pageSize, total_pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  get(id: number | string) {
    return this.items.find((r) => String(r.id) === String(id)) ?? null;
  }

  create(body: Partial<T>): T {
    const row = { id: this.autoId++, created_at: now(), updated_at: now(), ...body } as unknown as T;
    this.items.unshift(row);
    return row;
  }

  update(id: number | string, body: Partial<T>): T | null {
    const row = this.get(id);
    if (!row) return null;
    Object.assign(row, body, { id: row.id, updated_at: now() });
    return row;
  }

  delete(id: number | string): boolean {
    const i = this.items.findIndex((r) => String(r.id) === String(id));
    if (i < 0) return false;
    this.items.splice(i, 1);
    return true;
  }

  batchDelete(ids: (number | string)[]): number {
    let n = 0;
    for (const id of ids) if (this.delete(id)) n++;
    return n;
  }
}

/* ---------------------------------- seeds --------------------------------- */

export const users = new Store<Row>([
  { id: 1, username: "admin", email: "admin@raisfast.dev", role: "admin", status: "active", created_at: daysAgo(60) },
  { id: 2, username: "jane", email: "jane@example.com", role: "author", status: "active", created_at: daysAgo(40) },
  { id: 3, username: "bob", email: "bob@example.com", role: "user", status: "active", created_at: daysAgo(30) },
  { id: 4, username: "sara", email: "sara@example.com", role: "author", status: "active", created_at: daysAgo(12) },
]);

export const categories = new Store<Row>([
  { id: 1, name: "Engineering", slug: "engineering", description: "Deep dives and internals", created_at: daysAgo(50) },
  { id: 2, name: "Tutorials", slug: "tutorials", description: "Step-by-step guides", created_at: daysAgo(45) },
  { id: 3, name: "News", slug: "news", description: "Product updates", created_at: daysAgo(40) },
]);

export const tags = new Store<Row>([
  { id: 1, name: "rust", slug: "rust", created_at: daysAgo(50) },
  { id: 2, name: "react", slug: "react", created_at: daysAgo(48) },
  { id: 3, name: "cms", slug: "cms", created_at: daysAgo(46) },
  { id: 4, name: "tutorial", slug: "tutorial", created_at: daysAgo(44) },
]);

export const posts = new Store<Row>([
  {
    id: 1, title: "Introducing RaisFast", slug: "introducing-raisfast", status: "published",
    excerpt: "The fastest CMS, easiest to deploy.", category_id: 3, tags: ["cms", "rust"],
    content: "# Introducing RaisFast\n\nA single-binary, Rust-powered headless CMS.\n\n- zero dependencies\n- embedded admin UI",
    meta_title: "Introducing RaisFast", meta_description: "Single-binary headless CMS", author_id: 1,
    created_at: daysAgo(20), updated_at: daysAgo(2),
  },
  {
    id: 2, title: "Building your first content type", slug: "first-content-type", status: "published",
    excerpt: "Model anything with the schema builder.", category_id: 2, tags: ["tutorial", "cms"],
    content: "# Content types\n\nOpen **Content Types → Builder** and design your schema visually…",
    author_id: 2, created_at: daysAgo(15), updated_at: daysAgo(4),
  },
  {
    id: 3, title: "Draft: workflows deep dive", slug: "workflows-deep-dive", status: "draft",
    excerpt: "Steps, tasks, branches and delays.", category_id: 1, tags: ["rust"],
    content: "# Workflows\n\nThis draft explores the workflow engine…",
    author_id: 1, created_at: daysAgo(6), updated_at: daysAgo(1),
  },
]);

export const comments = new Store<Row>([
  { id: 1, post_id: 1, post_title: "Introducing RaisFast", author_name: "bob", content: "This is exactly what I was looking for!", status: "approved", created_at: daysAgo(18) },
  { id: 2, post_id: 1, post_title: "Introducing RaisFast", author_name: "sara", content: "How does the plugin sandbox isolate WASM?", status: "pending", created_at: daysAgo(3) },
  { id: 3, post_id: 2, post_title: "Building your first content type", author_name: "anon", content: "BUY NOW cheap…", status: "spam", created_at: daysAgo(9) },
  { id: 4, post_id: 2, post_title: "Building your first content type", author_name: "jane", content: "Great walkthrough, the revisions part especially.", status: "approved", created_at: daysAgo(5) },
]);

export const pages = new Store<Row>([
  {
    id: 1, title: "About", slug: "about", status: "published", sort_order: 1,
    meta_title: "About us", meta_description: "Who we are",
    blocks: [
      { type: "hero", name: "Intro", content: { heading: "About us", subheading: "We build fast tools" } },
      { type: "richtext", name: "Body", content: { html: "<p>RaisFast is built with Rust.</p>" } },
    ],
    created_at: daysAgo(35), updated_at: daysAgo(10),
  },
  {
    id: 2, title: "Landing v2", slug: "landing-v2", status: "draft", sort_order: 2,
    blocks: [{ type: "reusable", name: "CTA", block_key: "newsletter-cta" }],
    created_at: daysAgo(8), updated_at: daysAgo(1),
  },
]);

export const reusableBlocks = new Store<Row>([
  { id: 1, name: "Newsletter CTA", key: "newsletter-cta", type: "richtext", content: { html: "<h3>Subscribe</h3>" }, created_at: daysAgo(30) },
  { id: 2, name: "Footer Links", key: "footer-links", type: "custom", content: { links: ["Docs", "GitHub", "Contact"] }, created_at: daysAgo(28) },
]);

export const media = new Store<Row>(
  Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    filename: `seed-${i + 1}.jpg`,
    original_name: ["hero-banner", "team-photo", "screenshot-dashboard", "logo-dark", "cover-rust", "diagram-arch"][i] + ".jpg",
    path: `https://picsum.photos/seed/raisfast-${i + 1}/400/300`,
    mime_type: "image/jpeg",
    size: 42_000 + i * 13_500,
    created_at: daysAgo(25 - i * 3),
  })),
);

export const contentTypes = new Store<Row>([
  {
    id: 1, name: "events", singular: "event", plural: "Events", table: "events", builtin: false,
    description: "Community events",
    fields: [
      { name: "title", field_type: "text", required: true, label: "Title" },
      { name: "starts_at", field_type: "datetime", label: "Starts at" },
      { name: "location", field_type: "text", label: "Location" },
      { name: "capacity", field_type: "integer", label: "Capacity" },
      { name: "status", field_type: "enum", options: ["draft", "published", "cancelled"], label: "Status" },
      { name: "published", field_type: "boolean", label: "Published" },
    ],
    created_at: daysAgo(22),
  },
  {
    id: 2, name: "faqs", singular: "faq", plural: "FAQs", table: "faqs", builtin: false,
    description: "Frequently asked questions",
    fields: [
      { name: "question", field_type: "text", required: true },
      { name: "answer", field_type: "textarea", required: true },
      { name: "sort_order", field_type: "integer" },
      { name: "visible", field_type: "boolean" },
    ],
    created_at: daysAgo(21),
  },
]);

export const cmsRecords = new Map<string, Store<Row>>([
  [
    "event",
    new Store([
      { id: 1, title: "Rust meetup #12", starts_at: daysAgo(-7, 18), location: "HCMC", capacity: 80, status: "published", published: true, created_at: daysAgo(20), updated_at: daysAgo(3) },
      { id: 2, title: "CMS workshop", starts_at: daysAgo(-14, 9), location: "Online", capacity: 200, status: "draft", published: false, created_at: daysAgo(12), updated_at: daysAgo(2) },
      { id: 3, title: "Launch party", starts_at: daysAgo(5, 20), location: "Hanoi", capacity: 120, status: "cancelled", published: true, created_at: daysAgo(30), updated_at: daysAgo(6) },
    ]),
  ],
  [
    "faq",
    new Store([
      { id: 1, question: "Is it production ready?", answer: "Yes — single binary, migrations included.", sort_order: 1, visible: true, created_at: daysAgo(21), updated_at: daysAgo(21) },
      { id: 2, question: "Which databases are supported?", answer: "SQLite, PostgreSQL and MySQL.", sort_order: 2, visible: true, created_at: daysAgo(21), updated_at: daysAgo(4) },
      { id: 3, question: "Can I use multiple databases?", answer: "Yes, SQLite, PostgreSQL and MySQL.", sort_order: 3, visible: false, created_at: daysAgo(19), updated_at: daysAgo(19) },
    ]),
  ],
]);

/** revision history per `${collection}:${id}` */
export const revisions = new Map<string, Array<{ id: number; revision: number; created_at: string; editor: string }>>();
export function pushRevision(collection: string, record: Row, editor = "admin") {
  const key = `${collection}:${record.id}`;
  const arr = revisions.get(key) ?? [{ id: nid(), revision: 1, created_at: record.created_at ?? now(), editor }];
  if (arr.length > 0 && arr[arr.length - 1].created_at === record.updated_at) return;
  arr.push({ id: nid(), revision: arr.length + 1, created_at: record.updated_at ?? now(), editor });
  revisions.set(key, arr);
}

export const roles = new Store<Row>([
  { id: 1, name: "admin", description: "Full access", builtin: true, permissions: ["*:*"], created_at: daysAgo(60) },
  { id: 2, name: "author", description: "Can manage own content", builtin: true, permissions: ["posts:read", "posts:create", "posts:update", "media:read", "media:create"], created_at: daysAgo(60) },
  { id: 3, name: "editor", description: "Content review", builtin: false, permissions: ["posts:read", "comments:read", "comments:update"], created_at: daysAgo(15) },
]);

export const crons = new Store<Row>([
  { id: 1, name: "cleanup-temp", schedule: "0 3 * * *", command: "storage:cleanup", enabled: true, last_run_at: daysAgo(0, 3), next_run_at: daysAgo(-1, 3), created_at: daysAgo(40) },
  { id: 2, name: "weekly-digest", schedule: "0 8 * * 1", command: "mail:digest", enabled: false, last_run_at: daysAgo(7, 8), next_run_at: daysAgo(-7, 8), created_at: daysAgo(38) },
]);

export const cronLogs = new Store<Row>([
  { id: 1, cron_id: 1, status: "success", output: "removed 12 expired files (3.2 MB)", created_at: daysAgo(0, 3) },
  { id: 2, cron_id: 1, status: "success", output: "removed 4 expired files (0.8 MB)", created_at: daysAgo(1, 3) },
  { id: 3, cron_id: 2, status: "failed", error: "SMTP connection refused", created_at: daysAgo(7, 8) },
  { id: 4, cron_id: 1, status: "success", output: "nothing to clean", created_at: daysAgo(2, 3) },
]);

export const tenants = new Store<Row>([
  { id: 1, name: "Acme Corp", slug: "acme", status: "active", created_at: daysAgo(30) },
  { id: 2, name: "Globex", slug: "globex", status: "active", created_at: daysAgo(18) },
]);

export const webhooks = new Store<Row>([
  { id: 1, name: "Deploy hook", url: "https://ci.example.com/hooks/deploy", events: ["post.created", "post.updated"], active: true, created_at: daysAgo(20) },
  { id: 2, name: "Slack notify", url: "https://hooks.slack.com/services/T000/B000/XXX", events: ["comment.created"], active: false, created_at: daysAgo(14) },
]);

export const tokens = new Store<Row>([
  { id: 1, name: "ci-token", token_prefix: "rf_ci_9f2k", permissions: ["posts:read"], last_used_at: daysAgo(1), expires_at: daysAgo(-90), created_at: daysAgo(30) },
  { id: 2, name: "mobile-app", token_prefix: "rf_mob_71xk", permissions: ["posts:read", "comments:create"], last_used_at: daysAgo(0), created_at: daysAgo(12) },
]);

export const workflows = new Store<Row>([
  {
    id: 1, name: "Welcome email", description: "Send a welcome email after user signup", status: "published",
    definition: {
      nodes: [
        { id: "step-1", type: "step", position: { x: 80, y: 80 }, data: { label: "Signup", nodeType: "step", config: {} } },
        { id: "task-1", type: "task", position: { x: 340, y: 80 }, data: { label: "Send email", nodeType: "task", config: { template: "welcome" } } },
        { id: "delay-1", type: "delay", position: { x: 600, y: 80 }, data: { label: "Wait 1 day", nodeType: "delay", config: { seconds: 86400 } } },
      ],
      edges: [
        { id: "e1", source: "step-1", target: "task-1" },
        { id: "e2", source: "task-1", target: "delay-1" },
      ],
    },
    created_at: daysAgo(17), updated_at: daysAgo(3),
  },
]);

export const workflowInstances = new Store<Row>([
  { id: "inst-1001", workflow_id: 1, workflow_name: "Welcome email", status: "completed", current_step: "delay-1", started_at: daysAgo(2, 11), finished_at: daysAgo(2, 11), created_at: daysAgo(2, 11) },
  { id: "inst-1002", workflow_id: 1, workflow_name: "Welcome email", status: "running", current_step: "task-1", started_at: daysAgo(0, 9), created_at: daysAgo(0, 9) },
]);

export const options = new Store<Row>([
  { id: 1, key: "site_name", value: "RaisFast Demo", group: "site", autoload: true, created_at: daysAgo(50) },
  { id: 2, key: "site_description", value: "A blazing fast headless CMS", group: "site", autoload: true, created_at: daysAgo(50) },
  { id: 3, key: "posts_per_page", value: 10, group: "blog", autoload: true, created_at: daysAgo(49) },
  { id: 4, key: "registration_enabled", value: true, group: "auth", autoload: false, created_at: daysAgo(48) },
]);

export const audit = new Store<Row>([
  { id: 1, actor: "admin", action: "post.created", target_type: "post", target_id: "3", ip: "10.0.0.8", created_at: daysAgo(6, 14) },
  { id: 2, actor: "jane", action: "comment.approved", target_type: "comment", target_id: "4", ip: "10.0.0.15", created_at: daysAgo(5, 16) },
  { id: 3, actor: "admin", action: "plugin.enabled", target_type: "plugin", target_id: "analytics", ip: "10.0.0.8", created_at: daysAgo(4, 9) },
  { id: 4, actor: "admin", action: "workflow.started", target_type: "workflow", target_id: "1", ip: "10.0.0.8", created_at: daysAgo(2, 11) },
  { id: 5, actor: "sara", action: "media.uploaded", target_type: "media", target_id: "6", ip: "10.0.0.21", created_at: daysAgo(1, 13) },
  { id: 6, actor: "admin", action: "option.updated", target_type: "option", target_id: "site_name", ip: "10.0.0.8", created_at: daysAgo(1, 10) },
  { id: 7, actor: "admin", action: "token.created", target_type: "token", target_id: "2", ip: "10.0.0.8", created_at: daysAgo(0, 8) },
  { id: 8, actor: "jane", action: "user.login", target_type: "user", target_id: "2", ip: "10.0.0.15", created_at: daysAgo(0, 7) },
]);
