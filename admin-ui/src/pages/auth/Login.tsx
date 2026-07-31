import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function Login({ user }: { user?: boolean }) {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(t("adminLogin.error"));
      return;
    }
    setLoading(true);
    try {
      const bundle = await api.auth.login(email, password);
      login(bundle.user, bundle.access_token, bundle.refresh_token);
      navigate(location.state?.from ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminLogin.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            R
          </div>
          <h1 className="text-xl font-semibold">{t("adminLogin.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminLogin.subtitle")}</p>
        </div>

        <Card>
          <CardHeader className="sr-only">
            <CardTitle>{t("adminLogin.title")}</CardTitle>
            <CardDescription>{t("adminLogin.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label={t("adminLogin.email")}>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </Field>
              <Field label={t("adminLogin.password")} error={error}>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t("adminLogin.loading") : t("adminLogin.submit")}
              </Button>
            </form>
            {!user && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t("adminLogin.noAccount")}{" "}
                <Link to="/auth/register" className="text-primary hover:underline">
                  {t("adminLogin.register")}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">{t("adminLogin.footer")}</p>
      </div>
    </div>
  );
}

export function Register() {
  const { t } = useT();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const bundle = await api.auth.register(form);
      login(bundle.user, bundle.access_token, bundle.refresh_token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("register.title")}</CardTitle>
          <CardDescription>{t("register.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label={t("register.username")}>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </Field>
            <Field label={t("adminLogin.email")}>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label={t("adminLogin.password")}>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
            <Button type="submit" disabled={loading} className="w-full">
              {t("register.submit")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("register.haveAccount")}{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              {t("register.login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
