import { DemoBanner } from "@/components/DemoBanner";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-card md:block">
        <Sidebar />
      </aside>

      {/* mobile sidebar */}
      <div className={cn("fixed inset-0 z-50 md:hidden", !mobileOpen && "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-black/50 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-60 border-r border-border bg-card transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>

      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
    </div>
  );
}
