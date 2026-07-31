import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";

export function NotFound() {
  const { t } = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="text-6xl font-bold text-muted-foreground/30">404</span>
      <h1 className="text-lg font-semibold">{t("notFound.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("notFound.desc")}</p>
      <Link to="/dashboard">
        <Button variant="outline">{t("notFound.back")}</Button>
      </Link>
    </div>
  );
}
