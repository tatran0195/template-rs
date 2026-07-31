import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Profile() {
  const { t } = useT();
  const { user, setUser } = useAuthStore();
  const [info, setInfo] = useState({ username: user?.username ?? "", avatar: (user?.avatar as string) ?? "", bio: (user?.bio as string) ?? "" });
  const [pw, setPw] = useState({ old_password: "", new_password: "" });

  const bindings = useQuery({ queryKey: ["oauth-bindings"], queryFn: () => api.auth.listOAuthBindings(), retry: false });

  const saveInfo = useMutation({
    mutationFn: () => api.auth.updateMe(info),
    onSuccess: (u) => {
      if (u) setUser(u);
      toast.success(t("profile.saved"));
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const changePw = useMutation({
    mutationFn: () => api.auth.changePassword(pw),
    onSuccess: () => {
      toast.success(t("profile.passwordChanged"));
      setPw({ old_password: "", new_password: "" });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">{t("profile.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("profile.info")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
              {(user?.username ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
            </span>
            <div>
              <div className="font-medium">{user?.username ?? "—"}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
            <Badge className="ml-auto">{user?.role ?? "user"}</Badge>
          </div>
          <Field label={t("users.username")}>
            <Input value={info.username} onChange={(e) => setInfo({ ...info, username: e.target.value })} />
          </Field>
          <Field label={t("profile.avatar")}>
            <Input value={info.avatar} onChange={(e) => setInfo({ ...info, avatar: e.target.value })} />
          </Field>
          <Field label={t("profile.bio")}>
            <Textarea value={info.bio} onChange={(e) => setInfo({ ...info, bio: e.target.value })} />
          </Field>
          <Button onClick={() => saveInfo.mutate()} disabled={saveInfo.isPending}>
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("profile.changePassword")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={t("profile.oldPassword")}>
            <Input type="password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} />
          </Field>
          <Field label={t("profile.newPassword")}>
            <Input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
          </Field>
          <Button onClick={() => changePw.mutate()} disabled={changePw.isPending || !pw.old_password || !pw.new_password}>
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      {Array.isArray(bindings.data) && bindings.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("profile.bindings")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {bindings.data.map((b: any, i: number) => (
              <Badge key={i} variant="secondary">
                {b.provider ?? JSON.stringify(b)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
