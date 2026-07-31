import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { FileText, MessageSquare, FolderOpen, Tag, Image, Users, File } from "lucide-react";
import { api } from "@/lib/api/resources";
import { useT } from "@/i18n";
import { isDark } from "@/lib/theme";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const EVENT_COLORS: Record<string, string> = {
  "post.created": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "post.updated": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "comment.created": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "user.created": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

export function Dashboard() {
  const { t } = useT();

  const overview = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.stats.overview(),
    refetchInterval: 30000,
    retry: false,
  });
  const postsTrend = useQuery({
    queryKey: ["admin-stats-trends", "posts", 14],
    queryFn: () => api.stats.trends("posts", 14),
    refetchInterval: 60000,
    retry: false,
  });
  const commentsTrend = useQuery({
    queryKey: ["admin-stats-trends", "comments", 14],
    queryFn: () => api.stats.trends("comments", 14),
    refetchInterval: 60000,
    retry: false,
  });

  const d = overview.data;
  const activity = d?.recent_activity ?? [];
  const postsData = postsTrend.data?.data ?? [];
  const commentsData = commentsTrend.data?.data ?? [];
  const dark = isDark();

  const cards = [
    { label: t("dashboard.posts"), value: d?.total_posts, icon: FileText },
    { label: t("dashboard.users"), value: d?.total_users, icon: Users },
    { label: t("dashboard.comments"), value: d?.total_comments, icon: MessageSquare },
    { label: t("dashboard.categories"), value: d?.total_categories, icon: FolderOpen },
    { label: t("dashboard.tags"), value: d?.total_tags, icon: Tag },
    { label: t("dashboard.media"), value: d?.total_media, icon: Image },
    { label: t("dashboard.pages"), value: d?.total_pages, icon: File },
  ];

  const barData = {
    labels: postsData.map((p) => {
      const dt = new Date(p.date);
      return `${dt.getMonth() + 1}/${dt.getDate()}`;
    }),
    datasets: [
      {
        label: t("dashboard.posts"),
        data: postsData.map((p) => p.count),
        backgroundColor: dark ? "rgba(96, 165, 250, 0.7)" : "rgba(59, 130, 246, 0.7)",
        borderRadius: 4,
        borderSkipped: false as const,
      },
      {
        label: t("dashboard.comments"),
        data: commentsData.map((p) => p.count),
        backgroundColor: dark ? "rgba(52, 211, 153, 0.7)" : "rgba(16, 185, 129, 0.7)",
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  };

  const tickColor = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: dark ? "#1c1c24" : "#fff",
        titleColor: dark ? "#e5e5e5" : "#333",
        bodyColor: dark ? "#a3a3a3" : "#666",
        borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
      legend: { labels: { color: tickColor, boxWidth: 12 } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } }, border: { display: false } },
      y: {
        grid: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        ticks: { color: tickColor, font: { size: 11 } },
        border: { display: false },
        beginAtZero: true,
      },
    },
  } as const;

  const statusEntries = Object.entries((d?.comments_by_status as Record<string, number> | undefined) ?? {});
  const doughnutData = {
    labels: statusEntries.map(([k]) => k),
    datasets: [
      {
        data: statusEntries.map(([, v]) => v),
        backgroundColor: [
          "rgba(245, 158, 11, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(107, 114, 128, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("dashboard.title")}</h1>

      {overview.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs">{c.label}</span>
                  <c.icon className="size-4" />
                </div>
                <span className="text-2xl font-semibold">{c.value ?? "—"}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.trends")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={barData} options={barOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto">
            {activity.length === 0 ? (
              statusEntries.length > 0 ? (
                <div className="h-48">
                  <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: tickColor, boxWidth: 12 } } } }} />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
              )
            ) : (
              activity.slice(0, 12).map((a, i) => {
                const type = (a.type ?? a.action ?? "") as string;
                return (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        EVENT_COLORS[type] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {type || "event"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
