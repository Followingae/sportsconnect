"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

/**
 * The ink sidebar shared by the Event Admin and Super Admin portals.
 *
 * Both designs are drawn at 1060px only. Rather than leave the portals
 * unusable on a laptop or tablet, the rail collapses to an off-canvas drawer
 * below `lg`, and tables fall back to stacked cards (see ui/table).
 */

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export type NavGroup = { title?: string; items: NavItem[] };

export function PortalShell({
  brand,
  groups,
  user,
  children,
}: {
  brand: string;
  groups: NavGroup[];
  user: { name: string; role: string; avatar?: string | null };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-1">
        <span className="size-[26px] shrink-0 rounded-[8px] bg-volt" aria-hidden />
        <b className="text-[13.5px] font-extrabold tracking-[-0.01em] text-white">{brand}</b>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {groups.map((g, gi) => (
          <div key={g.title ?? gi} className={gi > 0 ? "mt-5" : undefined}>
            {g.title && (
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-inverse-3">
                {g.title}
              </p>
            )}
            {g.items.map((item) => {
              // Exact match for a section root, prefix match for its children.
              const active =
                pathname === item.href ||
                (item.href !== "/organizer" &&
                  item.href !== "/admin" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold",
                    active
                      ? "bg-volt/[0.16] text-white"
                      : "text-ink-inverse hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className={cn("shrink-0", active ? "text-volt" : "text-ink-inverse-3")}>
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                        active ? "bg-volt text-ink" : "bg-white/12 text-white"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-2.5 border-t border-white/8 pt-3.5">
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-white">{user.name}</p>
          <p className="truncate text-[11px] text-ink-inverse-3">{user.role}</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-white lg:flex">
      {/* mobile bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="grid size-9 place-items-center rounded-[10px] bg-soft"
        >
          <Menu size={18} aria-hidden />
        </button>
        <b className="text-[14px] font-extrabold tracking-[-0.01em]">{brand}</b>
      </div>

      {/* off-canvas drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
          />
          <aside className="on-ink absolute inset-y-0 left-0 flex w-[240px] flex-col bg-ink p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-[9px] text-white"
            >
              <X size={17} aria-hidden />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {/* fixed rail */}
      <aside className="on-ink sticky top-0 hidden h-dvh w-[212px] shrink-0 flex-col bg-ink p-3 lg:flex">
        {nav}
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Page header inside a portal: breadcrumb, title, actions. */
export function PortalHeader({
  crumb,
  title,
  actions,
}: {
  crumb?: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
      <div className="min-w-0 flex-1">
        {crumb && <p className="text-[12px] font-semibold text-ink-3">{crumb}</p>}
        <h1 className="mt-0.5 truncate text-[17px] font-extrabold tracking-[-0.02em]">
          {title}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PortalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 py-[18px]", className)}>{children}</div>;
}
