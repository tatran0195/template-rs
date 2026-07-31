import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { PageBlock } from "@/lib/api/types";
import { useT } from "@/i18n";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/misc";

const BLOCK_TYPES = ["hero", "richtext", "markdown", "image", "gallery", "cta", "faq", "features", "reusable", "custom"];

/** Block-based page editor (recovered: pages have a `blocks` array + SEO fields). */
export function PageEdit() {
  const { id } = useParams();
  const isNew = !id;
  const { t } = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ title: "", slug: "", status: "draft", sort_order: 0, meta_title: "", meta_description: "" });
  const [blocks, setBlocks] = useState<PageBlock[]>([]);

  const page = useQuery({
    queryKey: ["pages", id],
    queryFn: () => api.pages.get(id!),
    enabled: !isNew,
    retry: false,
  });

  useEffect(() => {
    const p = page.data;
    if (!p) return;
    setForm({
      title: p.title ?? "",
      slug: p.slug ?? "",
      status: p.status ?? "draft",
      sort_order: p.sort_order ?? 0,
      meta_title: p.meta_title ?? "",
      meta_description: p.meta_description ?? "",
    });
    setBlocks(Array.isArray(p.blocks) ? p.blocks : []);
  }, [page.data]);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, blocks: blocks.map((b, i) => ({ ...b, sort_order: i })) };
      return isNew ? api.pages.create(body as any) : api.pages.update(id!, body as any);
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      navigate("/pages");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const addBlock = () => setBlocks([...blocks, { type: "richtext", content: {} }]);
  const updateBlock = (i: number, patch: Partial<PageBlock>) =>
    setBlocks(blocks.map((b, bi) => (bi === i ? { ...b, ...patch } : b)));
  const moveBlock = (i: number, dir: -1 | 1) => {
    const next = [...blocks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const removeBlock = (i: number) => setBlocks(blocks.filter((_, bi) => bi !== i));

  if (!isNew && page.isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/pages">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{isNew ? t("pages.new") : t("pages.edit")}</h1>
        <div className="flex-1" />
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title}>
          <Save /> {t("common.save")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-4">
              <Field label={t("posts.postTitle")} required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("common.slug")}>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.title)} className="font-mono" />
                </Field>
                <Field label={t("pages.sortOrder")}>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{t("pages.blocks")}</CardTitle>
              <Button size="sm" variant="outline" onClick={addBlock}>
                <Plus /> {t("pages.addBlock")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {blocks.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>}
              {blocks.map((block, i) => (
                <div key={i} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Select value={block.type} onChange={(e) => updateBlock(i, { type: e.target.value })} className="w-40">
                      {BLOCK_TYPES.map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </Select>
                    <Input
                      value={block.name ?? ""}
                      onChange={(e) => updateBlock(i, { name: e.target.value })}
                      placeholder={t("common.name")}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}>
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeBlock(i)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                  {block.type === "reusable" ? (
                    <Input
                      value={block.block_key ?? ""}
                      onChange={(e) => updateBlock(i, { block_key: e.target.value })}
                      placeholder={t("reusableBlocks.key")}
                      className="font-mono text-xs"
                    />
                  ) : (
                    <Textarea
                      value={typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? {}, null, 2)}
                      onChange={(e) => {
                        let content: unknown = e.target.value;
                        try {
                          content = JSON.parse(e.target.value);
                        } catch {
                          /* keep as string until valid JSON */
                        }
                        updateBlock(i, { content: content as Record<string, unknown> });
                      }}
                      placeholder={t("pages.blockContent")}
                      className="min-h-20 font-mono text-xs"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <Field label={t("common.status")}>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">{t("posts.draft")}</option>
                  <option value="published">{t("posts.published")}</option>
                  <option value="archived">{t("posts.archived")}</option>
                </Select>
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("posts.seo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("posts.metaTitle")}>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} />
              </Field>
              <Field label={t("posts.metaDescription")}>
                <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
