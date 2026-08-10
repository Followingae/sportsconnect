"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Desktop navigation. The mobile design is a floating bottom bar, which is
 * right on a phone and wrong on a 1440px monitor — so from `lg` up the bottom
 * bar is hidden and this takes over.
 */
const LINKS = [
  { href: "/home", label: "Home", exact: true },
  { href: "/explore", label: "Explore" },
  { href: "/my-events", label: "My events" },
  { href: "/payments", label: "Payments" },
];

export function TopNav({
  signedIn,
  unread = 0,
  name,
}: {
  signedIn: boolean;
  unread?: number;
  name?: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-white/90 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-8">
        <Link
          href="/home"
          className="inline-flex shrink-0 items-baseline text-[20px] font-extrabold tracking-[-0.03em]"
        >
          sports<span className="text-volt-word">connect</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-[10px] px-3.5 py-2 text-[14px] font-semibold transition-colors",
                  active ? "bg-soft text-ink" : "text-ink-2 hover:text-ink"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/explore"
            aria-label="Search events"
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-soft hover:text-ink"
          >
            <Search size={18} aria-hidden />
          </Link>

          {signedIn ? (
            <>
              <Link
                href="/notifications"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                className="relative grid size-10 place-items-center rounded-full text-ink-2 hover:bg-soft hover:text-ink"
              >
                <Bell size={18} aria-hidden />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-volt px-1 text-[10px] font-extrabold text-ink">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-soft"
              >
                <span className="grid size-8 place-items-center rounded-full bg-av-1 text-[13px] font-extrabold text-white">
                  {name?.[0]?.toUpperCase() ?? "S"}
                </span>
                <span className="max-w-[120px] truncate text-[13.5px] font-semibold">
                  {name?.split(" ")[0] ?? "Profile"}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-[10px] px-3.5 py-2 text-[14px] font-bold text-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-[12px] bg-volt px-4 py-2.5 text-[14px] font-extrabold text-ink"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Compact header for phones, where the bottom bar carries navigation. */
export function MobileTopBar({
  signedIn,
  unread = 0,
}: {
  signedIn: boolean;
  unread?: number;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 lg:hidden">
      <Link
        href="/home"
        className="inline-flex items-baseline text-[19px] font-extrabold tracking-[-0.03em]"
      >
        sports<span className="text-volt-word">connect</span>
      </Link>
      {signedIn && (
        <Link
          href="/notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative grid size-9 place-items-center rounded-full bg-soft text-ink"
        >
          <Bell size={17} aria-hidden />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-volt px-1 text-[10px] font-extrabold text-ink">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      )}
      {!signedIn && (
        <Link
          href="/login"
          className="rounded-[10px] bg-soft px-3.5 py-2 text-[13px] font-bold text-ink"
        >
          Log in
        </Link>
      )}
    </div>
  );
}
