"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/** Shared behaviour: lock scroll, close on Escape, trap focus, restore focus. */
function useOverlay(open: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  const restoreTo = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

/* ---------------------------------------------------------------------------
   Modal — the back-office dialog (grant discount, permissions, add participant)
--------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  width = 440,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}) {
  const ref = useOverlay(open, onClose);
  const titleId = React.useId();
  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width: `min(${width}px, 100%)` }}
        className="animate-pop-in max-h-[90dvh] overflow-auto rounded-modal bg-white shadow-[var(--shadow-modal)]"
      >
        <header className="border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-[17px] font-extrabold tracking-[-0.01em]">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[11.5px] text-ink-3">{description}</p>}
        </header>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex gap-2.5 px-5 pb-5">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   BottomSheet — the consumer mobile pattern (payment method, share)
--------------------------------------------------------------------------- */

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useOverlay(open, onClose);
  const titleId = React.useId();
  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/35"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "animate-sheet-up w-full max-w-[520px] rounded-t-sheet bg-white",
          "max-h-[92dvh] overflow-auto px-5 pt-5 shadow-[var(--shadow-sheet)]"
        )}
        style={{ paddingBottom: "calc(26px + var(--safe-bottom))" }}
      >
        <div aria-hidden className="mx-auto mb-4 h-[5px] w-[42px] rounded-full bg-line" />
        <h2 id={titleId} className="text-h2">
          {title}
        </h2>
        {description && <p className="mt-2 text-meta text-ink-2">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   ConfirmDialog — required before every destructive action (reject, suspend,
   cancel event, remove participant, refund).
--------------------------------------------------------------------------- */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "volt"}
            size="md"
            className="flex-[2]"
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof body === "string" ? (
        <p className="text-[13.5px] leading-relaxed text-ink-2">{body}</p>
      ) : (
        body
      )}
    </Modal>
  );
}
