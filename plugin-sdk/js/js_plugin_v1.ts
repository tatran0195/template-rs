// JS Plugin SDK v1 — 唯一真相源
// 由本文件生成 sdk.d.ts，分发到各插件目录
// Host 函数签名必须与 src/plugins/js_host.rs register_host_functions() 保持一致

/* eslint-disable @typescript-eslint/no-explicit-any */

declare const axeHost: {
  log(level: string, msg: string): void;
  getConfig(key: string): string | null;
  httpGet(url: string): string;
  httpPost(url: string, body: string): string;
  getData(key: string): string | null;
  setData(key: string, value: string): boolean;
  getPost(slug: string): string | null;
  dbPh(idx: number): string;
  dbQuery(sql: string, params: string): string;
  dbExecute(sql: string, params: string): string;
  dbBegin(): string;
  dbCommit(): string;
  dbRollback(): string;
  vfsRead(path: string): string | null;
  vfsWrite(path: string, content: string): boolean;
  vfsDelete(path: string): boolean;
  vfsExists(path: string): boolean | null;
  vfsList(path: string): string | null;
  vfsStat(path: string): string | null;
  newId(): string;
  emitEvent(eventType: string, data: string): string;
};

export interface DbExecResult {
  error?: string;
  rows_affected?: number;
}

export interface PluginError {
  __plugin_error: boolean;
  __status: number;
  __message: string;
}

export const SDK_VERSION: string = "1.0.0";

export function dbPh(idx: number): string {
  return axeHost.dbPh(idx);
}

export function dbQuery(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const result = axeHost.dbQuery(sql, JSON.stringify(params));
  if (!result) throw new Error("query returned no result");
  if (result.startsWith("error:")) throw new Error(result.slice(6));
  return JSON.parse(result);
}

export function dbExec(sql: string, params: unknown[] = []): DbExecResult {
  const result = axeHost.dbExecute(sql, JSON.stringify(params));
  return JSON.parse(result);
}

export function dbBegin(): { ok: boolean } {
  const result = JSON.parse(axeHost.dbBegin());
  if (!result.ok) throw new Error("dbBegin failed");
  return result;
}

export function dbCommit(): { ok: boolean } {
  const result = JSON.parse(axeHost.dbCommit());
  if (!result.ok) throw new Error("dbCommit failed");
  return result;
}

export function dbRollback(): { ok: boolean } {
  return JSON.parse(axeHost.dbRollback());
}

export function httpGet(url: string): string | null {
  return axeHost.httpGet(url) || null;
}

export function httpGetJson(url: string): Record<string, unknown> | null {
  const result = axeHost.httpGet(url);
  if (!result) return null;
  return JSON.parse(result);
}

export function httpPost(url: string, body: Record<string, unknown> | string): string | null {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  return axeHost.httpPost(url, json) || null;
}

export function httpPostJson(url: string, body: Record<string, unknown> | string): Record<string, unknown> | null {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  const result = axeHost.httpPost(url, json);
  if (!result) return null;
  return JSON.parse(result);
}

export function configGet(key: string): string | null {
  return axeHost.getConfig(key);
}

export function storeGet(key: string): string | null {
  return axeHost.getData(key);
}

export function storeSet(key: string, value: string): boolean {
  return axeHost.setData(key, value);
}

export function vfsRead(path: string): string | null {
  return axeHost.vfsRead(path);
}

export function vfsWrite(path: string, content: string): boolean {
  return axeHost.vfsWrite(path, content);
}

export function vfsDelete(path: string): boolean {
  return axeHost.vfsDelete(path);
}

export function vfsExists(path: string): boolean {
  return axeHost.vfsExists(path) ?? false;
}

export function vfsList(path: string): string[] | null {
  const result = axeHost.vfsList(path);
  return result ? result.split(",") : null;
}

export function vfsStat(path: string): Record<string, unknown> | null {
  const result = axeHost.vfsStat(path);
  return result ? JSON.parse(result) : null;
}

export function getPost(slug: string): Record<string, unknown> | null {
  const result = axeHost.getPost(slug);
  return result ? JSON.parse(result) : null;
}

export function ok(data: unknown): any {
  return data;
}

export function fail(status: number, msg: string): PluginError {
  return { __plugin_error: true, __status: status, __message: msg };
}

export function extractJson(input: any, field?: string): any {
  try {
    let parsed: any;
    if (typeof input === "string") {
      parsed = JSON.parse(input);
    } else {
      parsed = input;
    }
    if (!field) return parsed;
    const parts = field.split(".");
    let val: any = parsed;
    for (const part of parts) {
      if (val == null || typeof val !== "object") return null;
      val = val[part];
    }
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val != null ? val : null;
  } catch { return null; }
}

export function logInfo(msg: string): void { axeHost.log("info", msg); }
export function logWarn(msg: string): void { axeHost.log("warn", msg); }
export function logError(msg: string): void { axeHost.log("error", msg); }

export function newId(): string {
  return axeHost.newId();
}

export function eventEmit(type: string, data: string | Record<string, unknown>): void {
  axeHost.emitEvent(type, typeof data === "string" ? data : JSON.stringify(data));
}
