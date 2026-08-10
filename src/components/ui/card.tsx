import * as React from "react";
import { cn } from "@/lib/cn";

/** Consumer-facing rounded surface. */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-card border border-line bg-white shadow-[var(--shadow-card)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Back-office bordered container with an optional header row. */
export function Panel({
  title,
  subtitle,
  action,
  bodyClassName,
  className,
  children,
  ...props
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  bodyClassName?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      {...props}
      className={cn("overflow-hidden rounded-panel border border-line bg-white", className)}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-[14px] font-extrabold tracking-[-0.01em]">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-0.5 text-[11px] text-ink-3">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/**
 * Dashboard metric. `emphasis` renders the ink-on-volt treatment the designs
 * reserve for the single most important number on the screen.
 */
export function KpiTile({
  label,
  value,
  hint,
  emphasis = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[13px] border p-3.5",
        emphasis ? "border-ink bg-ink" : "border-line bg-white",
        className
      )}
    >
      <div
        className={cn(
          "text-[12px] font-semibold",
          emphasis ? "text-ink-inverse" : "text-ink-3"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[24px] font-black tracking-[-0.02em] tabular-nums",
          emphasis ? "text-volt" : "text-ink"
        )}
      >
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            "mt-1 text-[11px]",
            emphasis ? "text-ink-inverse-3" : "text-ink-3"
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-line", className)} />;
}

/** Fill/capacity meter used for "28 / 32 teams". */
export function ProgressBar({
  value,
  max,
  className,
  showLabel = false,
}: {
  value: number;
  max: number;
  className?: string;
  showLabel?: boolean;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-[11px] font-extrabold tabular-nums">
          <span>{value}</span>
          <span className="text-ink-3">/{max}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${value} of ${max} filled`}
        className="h-[6px] overflow-hidden rounded-full bg-soft"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-volt-grad to-volt transition-[width] duration-[var(--duration-slow)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
