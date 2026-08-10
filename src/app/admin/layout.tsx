import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarRange,
  Shapes,
  Building2,
  UserCog,
  Users,
  Wallet,
  Undo2,
  Ticket,
  BarChart3,
  Flag,
  ScrollText,
  Settings,
} from "lucide-react";
import { PortalShell, type NavGroup } from "@/components/portal/shell";
import { requireSuperAdmin, getPlatformStats } from "@/lib/queries/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";

export const dynamic = "force-dynamic";

/**
 * The handoff shipped two incompatible sidebars for this portal (P1–P6 vs
 * P7–P12). This is the merged IA agreed in docs/DESIGN-GAPS.md §1.1: twelve
 * destinations in five groups, using the BRD's vocabulary — Event Admin and
 * Consumer, never Host or Player.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const ctx = await requireSuperAdmin();
  if (!ctx) redirect("/login?next=/admin");

  const stats = await getPlatformStats();

  const groups: NavGroup[] = [
    {
      title: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
        {
          href: "/admin/approvals",
          label: "Approvals",
          icon: <CheckSquare size={16} />,
          badge: stats.pendingApprovals,
        },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { href: "/admin/events", label: "Events", icon: <CalendarRange size={16} /> },
        { href: "/admin/sports", label: "Sports & formats", icon: <Shapes size={16} /> },
        { href: "/admin/venues", label: "Venues", icon: <Building2 size={16} /> },
      ],
    },
    {
      title: "People",
      items: [
        { href: "/admin/event-admins", label: "Event Admins", icon: <UserCog size={16} /> },
        { href: "/admin/consumers", label: "Consumers", icon: <Users size={16} /> },
      ],
    },
    {
      title: "Finance",
      items: [
        {
          href: "/admin/payments",
          label: "Payments",
          icon: <Wallet size={16} />,
          badge: stats.pendingPaymentsCount,
        },
        {
          href: "/admin/refunds",
          label: "Refunds",
          icon: <Undo2 size={16} />,
          badge: stats.refundsOpen,
        },
        { href: "/admin/discounts", label: "Discounts & credit", icon: <Ticket size={16} /> },
      ],
    },
    {
      title: "Oversight",
      items: [
        { href: "/admin/reports", label: "Reports", icon: <BarChart3 size={16} /> },
        { href: "/admin/moderation", label: "Moderation", icon: <Flag size={16} /> },
        { href: "/admin/audit", label: "Audit log", icon: <ScrollText size={16} /> },
        { href: "/admin/settings", label: "Settings", icon: <Settings size={16} /> },
      ],
    },
  ];

  return (
    <PortalShell
      brand="Sportsconnect"
      groups={groups}
      user={{
        name: ctx.profile.full_name || "Super Admin",
        role: "Super Admin",
        avatar: ctx.profile.avatar_url,
      }}
    >
      <main id="main">{children}</main>
    </PortalShell>
  );
}
