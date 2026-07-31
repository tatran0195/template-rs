import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Database, Hammer } from "lucide-react";
import { api } from "@/lib/api/resources";
import type { ContentType } from "@/lib/api/types";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoading, EmptyState } from "@/components/ui/misc";

/** Content type gallery → click a type to manage its items; "Builder" creates new ones. */
export function ContentTypeList() {
  const { t } = useT();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["content-types"],
    queryFn: async () => {
      const r = await api.contentTypes.list(1, 200);
      return Array.isArray(r) ? r : (r.items ?? []);
    },
    retry: false,
  });

  if (query.isLoading) return <PageLoading />;
  const types = (query.data ?? []) as ContentType[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{t("contentTypes.title")}</h1>
        <div className="flex-1" />
        <Button onClick={() => navigate("/content-types/builder")}>
          <Hammer /> {t("contentTypes.builder")}
        </Button>
      </div>

      {types.length === 0 ? (
        <EmptyState
          icon={<Database />}
          title={t("common.noResults")}
          action={<Button onClick={() => navigate("/content-types/builder")}>{t("contentTypes.newType")}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((ct) => (
            <Card
              key={ct.singular}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => navigate(`/content-types/${ct.singular}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ct.plural}</span>
                  {ct.builtin && <Badge variant="secondary">{t("contentTypes.builtin")}</Badge>}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{ct.table ?? ct.name}</div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {ct.fields?.length ?? 0} {t("contentTypes.fields").toLowerCase()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
