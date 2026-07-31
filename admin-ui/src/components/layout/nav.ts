import {
  LayoutDashboard, FileText, FolderOpen, Tag, MessageSquare, Image, File, Blocks,
  Database, Puzzle, Users, ShieldCheck, Clock, Building2, Webhook, KeyRound,
  Workflow, ScrollText, Settings, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  tenantOnly?: boolean; // only when builtinTenantable && admin
}

export interface NavGroup {
  labelKey: string | null;
  items: NavItem[];
}

/** Recovered sidebar structure — e-commerce & payments groups intentionally omitted. */
export const NAV: NavGroup[] = [
  {
    labelKey: null,
    items: [{ to: "/dashboard", labelKey: "layout.dashboard", icon: LayoutDashboard }],
  },
  {
    labelKey: "layout.content",
    items: [
      { to: "/posts", labelKey: "layout.posts", icon: FileText },
      { to: "/categories", labelKey: "layout.categories", icon: FolderOpen },
      { to: "/tags", labelKey: "layout.tags", icon: Tag },
      { to: "/comments", labelKey: "layout.comments", icon: MessageSquare },
      { to: "/media", labelKey: "layout.media", icon: Image },
      { to: "/pages", labelKey: "layout.pages", icon: File },
      { to: "/reusable-blocks", labelKey: "layout.reusableBlocks", icon: Blocks },
    ],
  },
  {
    labelKey: "layout.extension",
    items: [
      { to: "/content-types", labelKey: "layout.contentTypes", icon: Database },
      { to: "/plugins", labelKey: "layout.plugins", icon: Puzzle },
    ],
  },
  {
    labelKey: "layout.system",
    items: [
      { to: "/users", labelKey: "layout.users", icon: Users, adminOnly: true },
      { to: "/rbac", labelKey: "layout.rolesPermissions", icon: ShieldCheck, adminOnly: true },
      { to: "/crons", labelKey: "layout.cron", icon: Clock, adminOnly: true },
      { to: "/tenants", labelKey: "layout.tenants", icon: Building2, tenantOnly: true },
      { to: "/webhooks", labelKey: "layout.webhooks", icon: Webhook, adminOnly: true },
      { to: "/tokens", labelKey: "layout.apiTokens", icon: KeyRound },
      { to: "/workflows", labelKey: "layout.workflows", icon: Workflow, adminOnly: true },
      { to: "/audit", labelKey: "layout.auditLog", icon: ScrollText, adminOnly: true },
      { to: "/options", labelKey: "layout.options", icon: Settings, adminOnly: true },
    ],
  },
];
