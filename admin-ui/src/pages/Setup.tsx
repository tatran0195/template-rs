import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Database, HardDrive, Puzzle, UserCheck } from "lucide-react";
import { setupApi } from "@/lib/api/resources";
import type { SetupStatus } from "@/lib/api/types";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";

type Step = "check" | "database" | "admin" | "restarting" | "done";

/** 3-step first-run wizard: system check → database → admin creation. */
export function Setup() {
  const { t } = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("check");
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setStatus(await setupApi.status());
    } catch {
      setError(t("setup.failedToFetch"));
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps: Step[] = ["check", "database", "admin"];
  const stepIndex = steps.indexOf(step as (typeof steps)[number]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">{t("setup.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("setup.subtitle")}</p>
        </div>

        {/* stepper */}
        {stepIndex >= 0 && (
          <div className="mb-6 flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                    i < stepIndex && "bg-emerald-500 text-white",
                    i === stepIndex && "bg-primary text-primary-foreground",
                    i > stepIndex && "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <span className={cn("text-sm", i === stepIndex ? "font-medium" : "text-muted-foreground")}>
                  {t(`setup.step.${s}`)}
                </span>
                {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
              </div>
            ))}
          </div>
        )}

        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

        {step === "check" && <CheckStep status={status} onNext={() => setStep(status?.database.connected ? "admin" : "database")} />}
        {step === "database" && <DatabaseStep status={status} onDone={() => setStep("restarting")} />}
        {step === "restarting" && <RestartingStep onReady={() => setStep("admin")} />}
        {step === "admin" && <AdminStep onDone={() => setStep("done")} />}
        {step === "done" && (
          <Card>
            <CardHeader className="items-center text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <CardTitle>{t("setup.done.title")}</CardTitle>
              <CardDescription>{t("setup.done.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/auth/login")}>
                {t("setup.done.goToLogin")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-1.5 text-sm">
        {ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-destructive" />}
        <span className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>{detail}</span>
      </span>
    </div>
  );
}

function CheckStep({ status, onNext }: { status: SetupStatus | null; onNext: () => void }) {
  const { t } = useT();
  if (!status)
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("setup.check.desc")}
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("setup.check.title")}</CardTitle>
        <CardDescription>{t("setup.check.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <StatusRow
          ok={status.database.connected}
          label={t("setup.check.database")}
          detail={status.database.connected ? `${t("setup.check.connected")} (${status.database.db_type})` : t("setup.check.disconnected")}
        />
        <StatusRow
          ok={status.storage.writable}
          label={t("setup.check.storage")}
          detail={status.storage.writable ? t("setup.check.writable") : t("setup.check.notWritable")}
        />
        <StatusRow
          ok={status.extensions.writable}
          label={t("setup.check.extensions")}
          detail={status.extensions.writable ? t("setup.check.writable") : t("setup.check.notWritable")}
        />
        <StatusRow
          ok={status.has_admin}
          label={t("setup.check.adminUser")}
          detail={status.has_admin ? t("setup.check.adminExists") : t("setup.check.adminNeeded")}
        />
        <Button className="mt-2 w-full" onClick={onNext}>
          {status.database.connected ? t("setup.check.nextAdmin") : t("setup.check.next")}
        </Button>
      </CardContent>
    </Card>
  );
}

function DatabaseStep({ status, onDone }: { status: SetupStatus | null; onDone: () => void }) {
  const { t } = useT();
  const isSqlite = (status?.database.db_type ?? "sqlite").toLowerCase().includes("sqlite");
  const [mode, setMode] = useState(isSqlite ? "path" : "url");
  const [form, setForm] = useState({ path: "data/raisfast.db", url: "", host: "", port: "", username: "", password: "", database: "" });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const payload = () =>
    mode === "path"
      ? { path: form.path }
      : form.url
        ? { url: form.url }
        : { host: form.host, port: Number(form.port) || undefined, username: form.username, password: form.password, database: form.database };

  const test = async () => {
    setTesting(true);
    try {
      const r = await setupApi.testDatabase(payload());
      if (r.success) toast.success(t("setup.database.testSuccess"));
      else toast.error(r.message ?? t("setup.database.testFailed"));
    } catch {
      toast.error(t("setup.database.connectionError"));
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await setupApi.saveDatabase(payload());
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("setup.database.failedToSave"));
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-5" /> {t("setup.database.title")}
        </CardTitle>
        <CardDescription>{t("setup.database.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs
          tabs={[
            { value: "path", label: t("setup.database.path") },
            { value: "url", label: t("setup.database.manualInput") },
          ]}
          value={mode}
          onValueChange={setMode}
        />
        {mode === "path" ? (
          <Field label={t("setup.database.path")} hint={t("setup.database.pathHint")}>
            <Input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} />
          </Field>
        ) : (
          <>
            <Field label={t("setup.database.url")} hint={t("setup.database.urlHint")}>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="postgres://user:pass@host:5432/db" />
            </Field>
            {!form.url && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("setup.database.host")}>
                  <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
                </Field>
                <Field label={t("setup.database.port")}>
                  <Input value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
                </Field>
                <Field label={t("setup.database.username")}>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </Field>
                <Field label={t("setup.database.password")}>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </Field>
                <Field label={t("setup.database.name")} className="col-span-2">
                  <Input value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} />
                </Field>
              </div>
            )}
          </>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={test} disabled={testing} className="flex-1">
            {testing ? t("setup.database.testing") : t("setup.database.testConnection")}
          </Button>
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? t("setup.database.saving") : t("setup.database.saveAndRestart")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RestartingStep({ onReady }: { onReady: () => void }) {
  const { t } = useT();
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      // wait for the server to come back with a connected database
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const s = await setupApi.status();
          if (alive && s.database.connected) {
            onReady();
            return;
          }
        } catch {
          /* server still down */
        }
      }
    };
    poll();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="font-medium">{t("setup.restarting.title")}</p>
        <p className="text-sm text-muted-foreground">{t("setup.restarting.desc")}</p>
      </CardContent>
    </Card>
  );
}

function AdminStep({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const rules = [
    { ok: form.password.length >= 8, label: "≥ 8" },
    { ok: /[A-Z]/.test(form.password), label: "A-Z" },
    { ok: /[a-z]/.test(form.password), label: "a-z" },
    { ok: /\d/.test(form.password), label: "0-9" },
  ];
  const valid = rules.every((r) => r.ok) && form.password === form.confirm && form.username && form.email;

  const submit = async () => {
    if (form.password !== form.confirm) {
      setError(t("setup.admin.passwordsNotMatch"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      await setupApi.init({ username: form.username, email: form.email, password: form.password });
      toast.success(t("setup.adminCreated"));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("setup.failedToCreateAdmin"));
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="size-5" /> {t("setup.admin.title")}
        </CardTitle>
        <CardDescription>{t("setup.admin.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label={t("setup.admin.username")} required>
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </Field>
        <Field label={t("setup.admin.email")} required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t("setup.admin.password")} hint={t("setup.admin.passwordHint")} required>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex gap-2">
          {rules.map((r) => (
            <span
              key={r.label}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                r.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-muted text-muted-foreground",
              )}
            >
              {r.label}
            </span>
          ))}
        </div>
        <Field label={t("setup.admin.confirmPassword")} error={error}>
          <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <Button className="w-full" disabled={!valid || creating} onClick={submit}>
          {creating ? t("setup.admin.creating") : t("setup.admin.create")}
        </Button>
      </CardContent>
    </Card>
  );
}
