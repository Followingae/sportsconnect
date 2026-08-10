"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { EmptyState, SkeletonRows } from "./feedback";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  /** CSS grid track for this column, e.g. "2.4fr" or "120px". */
  width: string;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
};

/**
 * The back-office table from the designs: a CSS-grid header strip plus rows.
 * Grid (not <table>) so each row's cells align without table layout quirks,
 * while still exposing correct table semantics to assistive tech.
 *
 * On narrow screens it switches to a stacked card list — the admin portals are
 * desktop-first but must not be unusable on a phone.
 */
export function DataTable<T>({
  columns,
  rows,
  keyOf,
  loading,
  empty,
  onRowClick,
  className,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  loading?: boolean;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  caption: string;
}) {
  const template = columns.map((c) => c.width).join(" ");

  if (loading) {
    return (
      <div className={cn("overflow-hidden rounded-panel border border-line", className)}>
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cn("overflow-hidden rounded-panel border border-line", className)}>
        {empty ?? <EmptyState title="Nothing here yet" />}
      </div>
    );
  }

  return (
    <div
      role="table"
      aria-label={caption}
      style={{ ["--tpl" as string]: template }}
      className={cn("overflow-hidden rounded-panel border border-line", className)}
    >
      {/* Header — hidden in the stacked mobile layout. */}
      <div
        role="row"
        className="hidden gap-3.5 bg-soft px-4 py-2.5 md:grid md:[grid-template-columns:var(--tpl)]"
      >
        {columns.map((c) => (
          <div
            key={c.key}
            role="columnheader"
            className={cn(
              "text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-3",
              c.align === "right" && "text-right",
              c.align === "center" && "text-center"
            )}
          >
            {c.header}
          </div>
        ))}
      </div>

      {rows.map((row) => {
        const interactive = Boolean(onRowClick);
        return (
          <div
            key={keyOf(row)}
            role="row"
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onRowClick!(row) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick!(row);
                    }
                  }
                : undefined
            }
            className={cn(
              "grid grid-cols-1 gap-2 border-t border-line px-4 py-3 text-[12.5px]",
              // Below md the row stacks; from md it adopts the shared track
              // template, which is passed down as a CSS variable.
              "md:items-center md:gap-3.5 md:[grid-template-columns:var(--tpl)]",
              interactive && "cursor-pointer hover:bg-soft/60"
            )}
          >
            {columns.map((c) => (
              <div
                key={c.key}
                role="cell"
                className={cn(
                  "min-w-0",
                  c.align === "right" && "md:text-right",
                  c.align === "center" && "md:text-center"
                )}
              >
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-ink-3 md:hidden">
                  {c.header}
                </span>
                {c.render(row)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
