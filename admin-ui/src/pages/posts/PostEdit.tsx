import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MDEditor from "@uiw/react-md-editor";
import { ArrowLeft, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/i18n";
import { isDark } from "@/lib/theme";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/misc";

/** Simple tag chip input (recovered as a separate `tag-input` chunk). */
function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 dark:bg-input/30">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        className="min-w-20 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

export function PostEdit() {
  const { id } = useParams();
  const isNew = !id;
  const { t } = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    status: "draft",
    excerpt: "",
    content: "",
    category_id: "",
    meta_title: "",
    meta_description: "",
    featured_image: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);

  const post = useQuery({
    queryKey: ["posts", id],
    queryFn: () => api.posts.get(id!),
    enabled: !isNew,
    retry: false,
  });

  const categories = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => api.categories.list(1, 200),
    retry: false,
  });

  useEffect(() => {
    const p = post.data;
    if (!p) return;
    setForm({
      title: p.title ?? "",
      slug: p.slug ?? "",
      status: p.status ?? "draft",
      excerpt: p.excerpt ?? "",
      content: p.content ?? "",
      category_id: p.category_id != null ? String(p.category_id) : "",
      meta_title: p.meta_title ?? "",
      meta_description: p.meta_description ?? "",
      featured_image: (p.featured_image as string) ?? "",
    });
    setTags(((p.tags as string[]) ?? []).map(String));
    setSlugTouched(true);
  }, [post.data]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        category_id: form.category_id || null,
        tags,
      };
      return isNew ? api.posts.create(body as any) : api.posts.update(id!, body as any);
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate("/posts");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  if (!isNew && post.isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/posts">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{isNew ? t("posts.new") : t("posts.edit")}</h1>
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
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
                  }}
                />
              </Field>
              <Field label={t("common.slug")}>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  placeholder={t("posts.slugPlaceholder")}
                  className="font-mono"
                />
              </Field>
              <Field label={t("posts.excerpt")}>
                <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="min-h-16" />
              </Field>
              <Field label={t("posts.content")}>
                <div data-color-mode={isDark() ? "dark" : "light"}>
                  <MDEditor
                    value={form.content}
                    onChange={(v) => setForm({ ...form, content: v ?? "" })}
                    height={420}
                    preview="live"
                  />
                </div>
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

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <Field label={t("posts.status")}>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">{t("posts.draft")}</option>
                  <option value="published">{t("posts.published")}</option>
                  <option value="archived">{t("posts.archived")}</option>
                </Select>
              </Field>
              <Field label={t("posts.category")}>
                <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">—</option>
                  {(categories.data?.items ?? []).map((c: any) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("posts.tags")}>
                <TagInput value={tags} onChange={setTags} />
              </Field>
              <Field label={t("posts.featuredImage")}>
                <Input value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} className="font-mono text-xs" />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
