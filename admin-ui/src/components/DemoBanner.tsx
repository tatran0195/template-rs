import { Sparkles } from "lucide-react";

export function DemoBanner() {
  const isMock = import.meta.env.VITE_MOCK !== "false";
  if (!isMock) return null;
  return (
    <div className="relative z-50 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400/90 via-amber-500/90 to-orange-500/90 px-4 py-1.5 text-xs font-medium text-amber-950 shadow-lg backdrop-blur-sm">
      <Sparkles className="size-3.5" />
      <span>MSW mock backend active — no RaisFast binary needed. Sign in with any email/password.</span>
      <a href="#" onClick={(e) => { e.preventDefault(); document.getElementById("real-backend-doc")?.scrollIntoView(); }} className="underline underline-offset-2 hover:text-amber-950/80">Toggle / docs</a>
    </div>
  );
}
