import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileIcon, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/client";
import type { MediaItem } from "@/lib/api/types";
import { useT } from "@/i18n";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pagination, Skeleton } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm";

/** Media library: upload (multipart), grid, stats, copy URL, delete. */
export function Media() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<MediaItem | null>(null);

  const list = useQuery({
    queryKey: ["media", page],
    queryFn: () => api.media.list(page, 24),
    retry: false,
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.media.upload(file),
    onSuccess: () => {
      toast.success(t("media.uploadSuccess"));
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("media.uploadFailed")),
  });

  const del = useMutation({
    mutationFn: (id: string | number) => api.media.delete(id),
    onSuccess: () => {
      toast.success(t("common.deleted"));
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.failed")),
  });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalSize = items.reduce((acc, m) => acc + (m.size ?? 0), 0);

  const urlOf = (m: MediaItem) => api.media.getFileURL(m.url ?? m.path);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{t("media.title")}</h1>
        <span className="text-sm text-muted-foreground">{t("media.stats", { files: total, size: formatBytes(totalSize) })}</span>
        <div className="flex-1" />
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = "";
          }}
        />
        <Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
          <Upload /> {upload.isPending ? t("common.loading") : t("media.upload")}
        </Button>
      </div>

      {list.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <ImageIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => {
            const isImage = (m.mime_type ?? "").startsWith("image/");
            return (
              <div key={String(m.id)} className="group relative overflow-hidden rounded-lg border border-border bg-muted/30">
                <div className="flex aspect-square items-center justify-center">
                  {isImage ? (
                    <img src={urlOf(m)} alt={m.original_name ?? m.filename ?? ""} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <FileIcon className="size-10 text-muted-foreground" />
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="truncate text-[11px] text-white">{m.original_name ?? m.filename}</span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="rounded p-1 text-white/80 hover:text-white"
                      onClick={() => navigator.clipboard.writeText(urlOf(m)).then(() => toast.success(t("common.copied")))}
                      title={t("media.copyUrl")}
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button className="rounded p-1 text-white/80 hover:text-red-400" onClick={() => setDeleting(m)} title={t("common.delete")}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 24 && <Pagination page={page} pageSize={24} total={total} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={t("common.deleteConfirmTitle", { item: deleting?.original_name ?? deleting?.filename ?? "" })}
        description={t("common.deleteConfirmDesc")}
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id!)}
      />
    </div>
  );
}
