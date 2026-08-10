"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, CalendarCheck, Wallet, User } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The floating ink-on-glass nav from the designs. Five tabs, locked:
 * Home · Explore · My events · Payments · Profile.
 */
const TABS = [
  // "/" is the marketing site; the app's home lives at /home.
  { href: "/home", label: "Home", Icon: Home, exact: true },
  { href: "/explore", label: "Explore", Icon: Search },
  { href: "/my-events", label: "My events", Icon: CalendarCheck },
  { href: "/payments", label: "Payments", Icon: Wallet },
  { href: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-x-3 z-40 mx-auto max-w-[520px] rounded-nav p-[7px]",
        "flex items-stretch bg-ink/95 shadow-[var(--shadow-nav)] backdrop-blur-xl on-ink"
      )}
      style={{ bottom: "calc(16px + var(--safe-bottom))" }}
    >
      {TABS.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-[3px] rounded-[14px] py-1.5",
              "text-[9px] font-bold tracking-[0.02em] transition-colors",
              active ? "bg-volt text-ink" : "text-[#8b9099] hover:text-white"
            )}
          >
            <Icon size={16} strokeWidth={2.4} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
