"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "./button";

/**
 * Brief §11: "Empty states are invitations." Every list renders one of these
 * rather than showing nothing.
 */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 grid size-14 place-items-center rounded-full bg-soft text-[22px] text-ink-2">
          {icon}
        </div>
      )}
      <h3 className="text-[17px] font-extrabold tracking-[-0.01em]">{title}</h3>
      {body && <p className="mt-2 max-w-[340px] text-[13.5px] text-ink-2">{body}</p>}
      {actionLabel &&
        (actionHref ? (
          <ButtonLink href={actionHref} size="md" className="mt-5">
            {actionLabel}
          </ButtonLink>
        ) : (
          <Button size="md" className="mt-5" onClick={onAction}>
            {actionLabel}
          </Button>
        ))}
    </div>
  );
}

/**
 * Brief §11: "errors are specific and unapologetic." No "Oops!", no shrugging.
 */
export function ErrorState({
  title = "That didn't load",
  body,
  onRetry,
  className,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-danger-wash text-[22px] text-danger">
        !
      </div>
      <h3 className="text-[17px] font-extrabold tracking-[-0.01em]">{title}</h3>
      {body && <p className="mt-2 max-w-[340px] text-[13.5px] text-ink-2">{body}</p>}
      {onRetry && (
        <Button variant="ghost" size="md" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-[10px]", className)} />;
}

/** Placeholder rows so a table doesn't collapse while loading. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-line", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-[30px] rounded-full" />
          <Skeleton className="h-3 w-[28%]" />
          <Skeleton className="h-3 w-[18%]" />
          <Skeleton className="ml-auto h-3 w-[12%]" />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Toasts
--------------------------------------------------------------------------- */

type Toast = { id: number; message: string; tone: "default" | "success" | "danger" };

const ToastCtx = React.createContext<{
  toast: (message: string, tone?: Toast["tone"]) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const toast = React.useCallback((message: string, tone: Toast["tone"] = "default") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(var(--nav-clearance) + 8px)" }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-pop-in pointer-events-auto max-w-[420px] rounded-[14px] px-4 py-3",
              "text-[13.5px] font-semibold shadow-[var(--shadow-modal)]",
              t.tone === "success" && "bg-success-solid text-white",
              t.tone === "danger" && "bg-danger text-white",
              t.tone === "default" && "bg-ink text-white"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}
