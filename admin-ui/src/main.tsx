import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { App } from "./App";
import { initTheme, isDark } from "./lib/theme";
import "./index.css";

initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * MSW mock backend: ON by default (standalone demo, no raisfast binary needed).
 * Run against a real backend with: VITE_MOCK=false npm run dev
 */
async function bootstrap() {
  if (import.meta.env.VITE_MOCK !== "false") {
    const { worker } = await import("@/mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors position="top-right" theme={isDark() ? "dark" : "light"} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

bootstrap();
