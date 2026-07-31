import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Puzzle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { Plugin } from "@/lib/api/types";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageLoading, Switch } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useState } from "react";

const ENGINE_VARIANT: Record<string, "info" | "warning" | "success" | "secondary"> = {
  js: "warning",
  lua: "info",
  rhai: "success",
  wasm: "secondary",
};

export function PluginList() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [unloading, setUnloading] = useState<Plugin | null>(null);

  const list = useQuery({
    queryKey: ["plugins"],
    queryFn: async () => {
      const r = await api.plugins.list();
      return Array.isArray(r) ? r : ((r as any)?.items ?? []);
    },
    retry: false,
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "enable" | "disable" | "reload" }) => api.plugins[action](id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plugins"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const unload = useMutation({
    mutationFn: (id: string) => api.plugins.unload(id),
    onSuccess: () => {
      toast.success(t("common.deleted"));
      setUnloading(null);
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  if (list.isLoading) return <PageLoading />;
  const plugins = (list.data ?? []) as Plugin[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("plugins.title")}</h1>
      {plugins.length === 0 ? (
        <EmptyState icon={<Puzzle />} title={t("common.noResults")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plugins.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/plugins/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t("plugins.version")} {p.version ?? "—"} {p.author ? `· ${p.author}` : ""}
                    </div>
                  </div>
                  <Badge variant={ENGINE_VARIANT[(p.engine ?? "").toLowerCase()] ?? "secondary"}>{p.engine ?? "?"}</Badge>
                </div>
                {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={!!p.enabled}
                      onCheckedChange={(v) => act.mutate({ id: p.id, action: v ? "enable" : "disable" })}
                    />
                    {p.enabled ? t("common.enabled") : t("common.disabled")}
                  </label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => act.mutate({ id: p.id, action: "reload" })} aria-label={t("plugins.reload")}>
                      <RefreshCw />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setUnloading(p)} aria-label={t("plugins.unload")}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!unloading}
        onOpenChange={(v) => !v && setUnloading(null)}
        title={`${t("plugins.unload")} ${unloading?.name}?`}
        description={t("common.deleteConfirmDesc")}
        loading={unload.isPending}
        onConfirm={() => unloading && unload.mutate(unloading.id)}
      />
    </div>
  );
}

export function PluginDetail() {
  const { id } = useParams();
  const { t } = useT();

  const query = useQuery({
    queryKey: ["plugins", id],
    queryFn: () => api.plugins.get(id!),
    retry: false,
  });

  if (query.isLoading) return <PageLoading />;
  const p = query.data;
  if (!p) return <EmptyState title={t("common.noResults")} />;

  const permissions = p.permissions ?? (p.manifest?.permissions as string[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/plugins">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{p.name}</h1>
        <Badge variant={ENGINE_VARIANT[(p.engine ?? "").toLowerCase()] ?? "secondary"}>{p.engine ?? "?"}</Badge>
        {p.enabled !== undefined && <Badge variant={p.enabled ? "success" : "secondary"}>{p.enabled ? t("common.enabled") : t("common.disabled")}</Badge>}
      </div>

      {permissions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-medium">{t("permissions.declaredFromManifest")}</h2>
            <div className="flex flex-wrap gap-1.5">
              {permissions.map((perm) => (
                <code key={perm} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {perm}
                </code>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-2 text-sm font-medium">{t("plugins.manifest")}</h2>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(p.manifest ?? p, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
