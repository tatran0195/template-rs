import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useT } from "@/i18n";

/** Path-derived breadcrumbs, mirroring the recovered breadcrumb component. */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useT();
  const segs = pathname.split("/").filter(Boolean);

  const labelFor = (seg: string, i: number) => {
    const key = `layout.${seg === "content-types" ? "contentTypes" : seg.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
    const translated = t(key);
    if (translated !== key) return translated;
    if (seg === "new") return t("common.create");
    if (seg === "edit" && i > 0) return t("common.edit");
    return seg;
  };

  return (
    <nav data-slot="breadcrumb" className="flex items-center text-sm text-muted-foreground">
      <ol className="flex items-center gap-1.5">
        {segs.map((seg, i) => {
          const to = "/" + segs.slice(0, i + 1).join("/");
          const last = i === segs.length - 1;
          return (
            <li key={to} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50" />}
              {last ? (
                <span data-slot="breadcrumb-page" className="font-medium text-foreground">
                  {labelFor(seg, i)}
                </span>
              ) : (
                <Link to={to} className="transition-colors hover:text-foreground">
                  {labelFor(seg, i)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
