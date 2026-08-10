import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Bell, Settings, Wallet, CalendarCheck, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyRegistrations, getUnreadNotificationCount } from "@/lib/queries/my";
import { getAccountPerks } from "@/lib/queries/settings";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { Card, Divider } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/lib/actions/auth";
import { money } from "@/lib/format";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [{ data: profile }, groups, perks, unread] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getMyRegistrations(user.id),
    getAccountPerks(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  const name = profile?.full_name || user.email || "You";

  const stats = [
    { label: "Registered", value: groups.upcoming.length },
    { label: "Played", value: groups.past.length },
    { label: "Waitlist", value: groups.waitlist.length },
  ];

  const links = [
    { href: "/my-events", label: "My events", Icon: CalendarCheck },
    { href: "/payments", label: "Payments & receipts", Icon: Wallet },
    {
      href: "/notifications",
      label: "Notifications",
      Icon: Bell,
      badge: unread > 0 ? String(unread) : undefined,
    },
    { href: "/profile/settings", label: "Settings", Icon: Settings },
  ];

  return (
    <div>
      <header className="px-5 pt-6 text-center lg:px-0 lg:pt-0 lg:text-left">
        <Avatar name={name} src={profile?.avatar_url} size="xl" className="mx-auto lg:mx-0" />
        <h1 className="mt-4 text-h2 lg:text-[32px] lg:tracking-[-0.03em]">{name}</h1>
        <p className="mt-1 text-[13px] text-ink-2">{profile?.email ?? user.email}</p>
        {profile?.phone && <p className="text-[13px] text-ink-3">{profile.phone}</p>}
      </header>

      <div className="mt-5 flex gap-3 px-5 lg:mt-8 lg:max-w-[520px] lg:px-0">
        {stats.map((s) => (
          <Card key={s.label} className="flex-1 px-2.5 py-4 text-center">
            <p className="text-[24px] font-black tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-[12px] text-ink-2">{s.label}</p>
          </Card>
        ))}
      </div>

      {(perks.creditTotal > 0 || perks.discountPercent > 0) && (
        <section className="mx-5 mt-4 flex items-center justify-between gap-4 rounded-card-lg bg-ink p-[18px] text-white lg:mx-0 lg:max-w-[520px] lg:p-6">
          <div>
            <p className="text-[12px] text-ink-inverse">Account credit</p>
            <p className="mt-0.5 text-[24px] font-black tabular-nums text-volt">
              {money(perks.creditTotal)}
            </p>
          </div>
          {perks.discountPercent > 0 && (
            <p className="max-w-[120px] text-right text-[11.5px] text-ink-inverse">
              plus {perks.discountPercent}% member discount
            </p>
          )}
        </section>
      )}

      <Card className="mx-5 mt-4 p-0 lg:mx-0 lg:max-w-[520px]">
        {links.map((l, i) => (
          <div key={l.href}>
            {i > 0 && <Divider className="mx-4" />}
            <Link
              href={l.href}
              className="flex items-center gap-3 px-4 py-3.5 text-[14.5px] font-semibold"
            >
              <l.Icon size={17} aria-hidden className="text-ink-3" />
              <span className="flex-1">{l.label}</span>
              {l.badge && (
                <span className="grid min-w-5 place-items-center rounded-full bg-volt px-1.5 text-[11px] font-extrabold text-ink">
                  {l.badge}
                </span>
              )}
              <ChevronRight size={16} aria-hidden className="text-ink-3" />
            </Link>
          </div>
        ))}
      </Card>

      <form action={signOut} className="mx-5 mt-4 lg:mx-0 lg:max-w-[520px]">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-card border border-line-strong bg-white py-3.5 text-[14px] font-bold text-danger"
        >
          <LogOut size={16} aria-hidden />
          Sign out
        </button>
      </form>

      <p className="mt-6 px-5 text-center text-[12px] text-ink-3">
        Sportsconnect · Dubai
      </p>
    </div>
  );
}
