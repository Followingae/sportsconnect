import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Plus,
  Users,
  Shield,
  Wallet,
  Mail,
  BarChart3,
} from "lucide-react";
import { PortalShell, type NavGroup } from "@/components/portal/shell";
import { getOrganizerContext, getOrganizerStats } from "@/lib/queries/organizer";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";

export const dynamic = "force-dynamic";

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const ctx = await getOrganizerContext();
  if (!ctx) redirect("/login?next=/organizer");

  const stats = await getOrganizerStats();

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/organizer", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
        {
          href: "/organizer/events",
          label: "My events",
          icon: <CalendarRange size={16} />,
        },
        {
          href: "/organizer/events/new",
          label: "Create event",
          icon: <Plus size={16} />,
        },
      ],
    },
    {
      title: "This event",
      items: [
        { href: "/organizer/participants", label: "Participants", icon: <Users size={16} /> },
        { href: "/organizer/teams", label: "Teams", icon: <Shield size={16} /> },
        {
          href: "/organizer/payments",
          label: "Payments",
          icon: <Wallet size={16} />,
          badge: stats.pendingPayments,
        },
        { href: "/organizer/messages", label: "Messages", icon: <Mail size={16} /> },
        { href: "/organizer/reports", label: "Reports", icon: <BarChart3 size={16} /> },
      ],
    },
  ];

  return (
    <PortalShell
      brand="Sportsconnect"
      groups={groups}
      user={{
        name: ctx.profile?.full_name || "Event Admin",
        role: ctx.organization?.name
          ? `${ctx.organization.name} · Event Admin`
          : "Event Admin",
        avatar: ctx.profile?.avatar_url,
      }}
    >
      <main id="main">{children}</main>
    </PortalShell>
  );
}
