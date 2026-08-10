"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Filter/selection pill. Selected state is ink-on-white — deliberately not
 * volt, so the one volt element on a screen stays the primary action.
 */
export function Chip({
  selected,
  removable,
  onRemove,
  className,
  children,
  ...props
}: {
  selected?: boolean;
  removable?: boolean;
  onRemove?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full",
        "px-3.5 py-2 text-[13px] font-semibold transition-colors duration-[var(--duration-fast)]",
        selected ? "bg-ink text-white" : "bg-soft text-ink hover:bg-[#e9ece7]",
        className
      )}
      {...props}
    >
      {children}
      {removable && (
        <span
          role="button"
          tabIndex={-1}
          aria-label="Remove filter"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="-mr-1 ml-0.5 grid size-4 place-items-center rounded-full text-[10px] opacity-70 hover:opacity-100"
        >
          ✕
        </span>
      )}
    </button>
  );
}

/** Read-only pill for level, format, "what's included" and similar tags. */
export function Tag({
  tone = "soft",
  className,
  children,
}: {
  tone?: "soft" | "volt" | "outline";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1",
        "text-[11.5px] font-semibold",
        tone === "soft" && "bg-soft text-ink-2",
        tone === "volt" && "bg-volt text-ink",
        tone === "outline" && "border border-line-strong text-ink-2",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Horizontally scrollable filter rail that doesn't show a scrollbar. */
export function ChipRail({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5", className)}>
      {children}
    </div>
  );
}
