import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";
import { useLocaleStore } from "@/stores/locale";
import type { ApiEnvelope, TokenBundle } from "./types";

/**
 * Faithful re-implementation of the HTTP core recovered from the bundle:
 *  - {code, message, data} envelope; code !== 0 throws ApiError
 *  - Authorization Bearer + X-Tenant-ID + Accept-Language headers
 *  - single-flight refresh on 401, retry original request once
 *  - keyed AbortController cancellation, beforeSend/afterSend hooks
 *  - dual "restful"/"rpc" apiStyle path helpers
 */
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public status: number,
    public url: string,
    public payload?: unknown,
    public aborted = false,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiStyle = "restful" | "rpc";

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  requestKey?: string;
  fetch?: typeof fetch;
}

export class HttpClient {
  private _apiStyle: ApiStyle = "restful";
  private _refreshPromise: Promise<string | null> | null = null;
  private _controllers = new Map<string, AbortController>();

  beforeSend: ((url: string, init: RequestInit) => Promise<{ url: string; init: RequestInit }> | { url: string; init: RequestInit }) | null = null;
  afterSend: ((response: Response, data: unknown) => unknown) | null = null;

  constructor(public baseUrl = "/api/v1") {}

  get apiStyle() {
    return this._apiStyle;
  }
  set apiStyle(v: ApiStyle) {
    this._apiStyle = v;
  }

  pathForCreate(p: string) {
    return this._apiStyle === "restful" ? p : `${p}/create`;
  }
  methodForCreate() {
    return "POST";
  }
  pathForUpdate(p: string, id: string | number) {
    return this._apiStyle === "restful" ? `${p}/${id}` : `${p}/${id}/update`;
  }
  methodForUpdate() {
    return this._apiStyle === "restful" ? "PUT" : "POST";
  }
  pathForDelete(p: string, id: string | number) {
    return this._apiStyle === "restful" ? `${p}/${id}` : `${p}/${id}/delete`;
  }
  methodForDelete() {
    return this._apiStyle === "restful" ? "DELETE" : "POST";
  }

  cancelRequest(key: string) {
    this._controllers.get(key)?.abort();
    this._controllers.delete(key);
  }
  cancelAllRequests() {
    for (const c of this._controllers.values()) c.abort();
    this._controllers.clear();
  }

  async request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, query, headers, signal, requestKey } = opts;
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const q = new URLSearchParams(query).toString();
      if (q) url += (url.includes("?") ? "&" : "?") + q;
    }

    const h = new Headers();
    if (body != null && !(body instanceof FormData)) h.set("Content-Type", "application/json");

    const { accessToken } = useAuthStore.getState();
    if (accessToken) h.set("Authorization", `Bearer ${accessToken}`);
    const tenantId = useTenantStore.getState().currentTenantId;
    if (tenantId) h.set("X-Tenant-ID", tenantId);
    const locale = useLocaleStore.getState().locale;
    if (locale) h.set("Accept-Language", locale);
    if (headers) for (const [k, v] of Object.entries(headers)) h.set(k, v);

    let sig = signal;
    if (requestKey) {
      this.cancelRequest(requestKey);
      const ctrl = new AbortController();
      this._controllers.set(requestKey, ctrl);
      signal?.addEventListener("abort", () => ctrl.abort());
      sig = ctrl.signal;
    }

    let init: RequestInit = {
      method,
      headers: h,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: sig,
    };

    if (this.beforeSend) {
      const r = await this.beforeSend(url, init);
      url = r.url;
      init = { ...init, ...r.init };
    }

    const doFetch = opts.fetch ?? fetch;
    let res: Response;
    try {
      res = await doFetch(url, init);
    } catch (err) {
      if (requestKey) this._controllers.delete(requestKey);
      throw new ApiError(
        0,
        err instanceof Error ? err.message : "Network request failed",
        0,
        url,
        {},
        err instanceof DOMException && err.name === "AbortError",
        err,
      );
    }

    if (res.status === 401 && useAuthStore.getState().isLoggedIn()) {
      const token = await this._refresh();
      if (token) {
        const h2 = new Headers(init.headers);
        h2.set("Authorization", `Bearer ${token}`);
        init = { ...init, headers: h2 };
        res = await doFetch(url, init);
      }
    }

    if (requestKey) this._controllers.delete(requestKey);

    let json: ApiEnvelope<T>;
    try {
      json = (await res.json()) as ApiEnvelope<T>;
    } catch (err) {
      throw new ApiError(0, "Failed to parse response", res.status, url, {}, false, err);
    }
    if (json.code !== 0) {
      throw new ApiError(json.code ?? 0, json.message ?? "Unknown error", res.status, url, json);
    }
    let data = json.data;
    if (this.afterSend) data = (await this.afterSend(res, data)) as T;
    return data as T;
  }

  get<T = any>(path: string, opts?: RequestOptions) {
    return this.request<T>(path, { ...opts, method: "GET" });
  }
  post<T = any>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>(path, { ...opts, method: "POST", body });
  }
  put<T = any>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>(path, { ...opts, method: "PUT", body });
  }
  del<T = any>(path: string, opts?: RequestOptions) {
    return this.request<T>(path, { ...opts, method: "DELETE" });
  }

  /** single-flight token refresh; clears auth on failure (as recovered). */
  private _refresh(): Promise<string | null> {
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = (async () => {
      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) return null;
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const json = (await res.json()) as ApiEnvelope<TokenBundle>;
        if (json.code !== 0) {
          useAuthStore.getState().logout();
          return null;
        }
        const bundle = json.data;
        useAuthStore.getState().setTokens(bundle.access_token, bundle.refresh_token);
        if (bundle.user) useAuthStore.getState().setUser(bundle.user);
        return bundle.access_token;
      } catch {
        useAuthStore.getState().logout();
        return null;
      } finally {
        this._refreshPromise = null;
      }
    })();
    return this._refreshPromise;
  }
}

export const http = new HttpClient("/api/v1");
