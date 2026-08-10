import * as React from "react";
import { cn } from "@/lib/cn";
import type { Tone, StatusMeta } from "@/lib/status";
import {
  EVENT_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
  REGISTRATION_STATUS,
} from "@/lib/status";
import type { Enums } from "@/lib/database.types";

const TONES: Record<Tone, string> = {
  neutral: "bg-soft text-ink-2",
  volt: "bg-volt-wash text-volt-deep",
  success: "bg-success-wash text-success",
  warning: "bg-warning-wash text-warning",
  danger: "bg-danger-wash text-danger",
  info: "bg-info-wash text-info",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: {
  tone?: Tone;
  dot?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full",
        "px-2.5 py-1 text-[11.5px] font-semibold",
        TONES[tone],
        className
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/**
 * Renders any domain status from the single vocabulary in lib/status.ts.
 * The `help` text becomes the title attribute so the meaning is always one
 * hover away in the dense back-office tables.
 */
function fromMeta(meta: StatusMeta, dot: boolean, className?: string) {
  return (
    <Badge tone={meta.tone} dot={dot} title={meta.help} className={className}>
      {meta.label}
    </Badge>
  );
}

export const EventStatusBadge = ({
  status,
  dot = true,
  className,
}: {
  status: Enums<"event_status">;
  dot?: boolean;
  className?: string;
}) => fromMeta(EVENT_STATUS[status], dot, className);

export const RegistrationStatusBadge = ({
  status,
  dot = true,
  className,
}: {
  status: Enums<"registration_status">;
  dot?: boolean;
  className?: string;
}) => fromMeta(REGISTRATION_STATUS[status], dot, className);

export const PaymentStatusBadge = ({
  status,
  dot = true,
  className,
}: {
  status: Enums<"payment_status">;
  dot?: boolean;
  className?: string;
}) => fromMeta(PAYMENT_STATUS[status], dot, className);

export const RefundStatusBadge = ({
  status,
  dot = true,
  className,
}: {
  status: Enums<"refund_status">;
  dot?: boolean;
  className?: string;
}) => fromMeta(REFUND_STATUS[status], dot, className);

/** The gated-feature marker used wherever venue accounts or card payment appear. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <Badge tone="volt" className={cn("uppercase tracking-wide text-[10.5px]", className)}>
      Coming soon
    </Badge>
  );
}
