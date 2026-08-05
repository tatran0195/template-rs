/** Shared API shapes (recovered from the bundle + Rust DTOs). Loose on purpose: the
 * backend is the source of truth and evolves; unknown fields pass through. */

export interface ApiEnvelope<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

export interface Paginated<T = any> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

export interface User {
  id: number | string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  bio?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface TokenBundle {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in?: number;
}

export interface Post {
  id: number | string;
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  status?: string;
  category_id?: number | string | null;
  tags?: (number | string)[] | string[];
  meta_title?: string;
  meta_description?: string;
  featured_image?: string;
  author_id?: number | string;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface Page {
  id: number | string;
  title: string;
  slug?: string;
  blocks?: PageBlock[];
  status?: string;
  sort_order?: number;
  meta_title?: string;
  meta_description?: string;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface PageBlock {
  id?: string;
  type: string;
  name?: string;
  content?: Record<string, unknown>;
  block_key?: string;
}

export interface FieldDef {
  name: string;
  field_type: string;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  private?: boolean;
  immutable?: boolean;
  label?: string;
  description?: string;
  max_length?: number;
  min?: number;
  max?: number;
  options?: string[];
  relation?: string;
  [k: string]: unknown;
}

export interface ContentType {
  id?: number | string;
  name: string;
  singular: string;
  plural: string;
  table?: string;
  kind?: string;
  description?: string;
  fields: FieldDef[];
  builtin?: boolean;
  [k: string]: unknown;
}



export interface CronJob {
  id: number | string;
  name: string;
  schedule: string;
  command?: string;
  task?: string;
  enabled?: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface Tenant {
  id: number | string;
  name: string;
  slug?: string;
  status?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface Webhook {
  id: number | string;
  name?: string;
  url: string;
  events?: string[];
  secret?: string;
  active?: boolean;
  created_at?: string;
  [k: string]: unknown;
}

export interface ApiToken {
  id: number | string;
  name: string;
  token_prefix?: string;
  token?: string; // only returned once at creation
  permissions?: string[];
  expires_at?: string;
  last_used_at?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface WorkflowDef {
  id: number | string;
  name: string;
  description?: string;
  status?: string;
  definition?: { nodes?: any[]; edges?: any[] } & Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface WorkflowInstance {
  id: number | string;
  workflow_id?: number | string;
  workflow_name?: string;
  status?: string;
  current_step?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface AuditEntry {
  id: number | string;
  actor?: string;
  user_id?: number | string;
  action: string;
  target_type?: string;
  target_id?: string;
  detail?: unknown;
  ip?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface OptionEntry {
  id?: number | string;
  key: string;
  value?: unknown;
  group?: string;
  autoload?: boolean;
  [k: string]: unknown;
}

export interface RoleDef {
  id: number | string;
  name: string;
  description?: string;
  builtin?: boolean;
  permissions?: string[];
  [k: string]: unknown;
}

export interface MediaItem {
  id: number | string;
  filename?: string;
  original_name?: string;
  path?: string;
  url?: string;
  mime_type?: string;
  size?: number;
  width?: number;
  height?: number;
  created_at?: string;
  [k: string]: unknown;
}

export interface StatsOverview {
  total_posts?: number;
  total_users?: number;
  total_media?: number;
  total_comments?: number;
  total_categories?: number;
  total_tags?: number;
  total_pages?: number;
  recent_activity?: Array<{ type?: string; action?: string; label?: string; created_at?: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface SetupStatus {
  database: {
    db_type: string;
    connected: boolean;
    url_masked: string;
    host?: string | null;
    port?: number | null;
    username?: string | null;
    database?: string | null;
  };
  storage: { writable: boolean; path: string };
  extensions: { writable: boolean; content_types_path: string };
  has_admin: boolean;
}
