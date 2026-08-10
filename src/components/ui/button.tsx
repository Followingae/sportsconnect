import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Design rule from the handoff: one volt action per screen. `volt` is the
 * single primary CTA; everything else is ink, ghost or quiet.
 */
export type ButtonVariant =
  | "volt"
  | "ink"
  | "ghost"
  | "quiet"
  | "success"
  | "danger"
  | "whatsapp";

export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  volt: "bg-volt text-ink hover:bg-[#bce62c] active:bg-[#aed825]",
  ink: "bg-ink text-white hover:bg-[#22252b] active:bg-[#0d0f12]",
  ghost:
    "bg-white text-ink border border-line-strong hover:bg-soft active:bg-[#e9ece7]",
  quiet: "bg-soft text-ink hover:bg-[#e9ece7] active:bg-[#e1e5df]",
  success: "bg-success-solid text-white hover:bg-[#1b8a51] active:bg-[#177746]",
  danger: "bg-white text-danger border border-line-strong hover:bg-danger-wash",
  whatsapp: "bg-whatsapp text-white hover:bg-[#20bd5b] active:bg-[#1da851]",
};

const SIZES: Record<ButtonSize, string> = {
  // Back-office density.
  sm: "text-[12px] font-bold px-3.5 py-[7px] rounded-btn-sm gap-1.5",
  md: "text-[14px] font-bold px-4 py-2.5 rounded-[12px] gap-2",
  // Full-width mobile CTA from the designs.
  lg: "text-[16px] font-extrabold px-5 py-[17px] rounded-btn gap-2.5",
};

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center whitespace-nowrap select-none " +
  "transition-colors duration-[var(--duration-fast)] " +
  "disabled:opacity-45 disabled:pointer-events-none";

export type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "volt",
  size = "md",
  block,
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, VARIANTS[variant], SIZES[size], block && "w-full", className)}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export type ButtonLinkProps = BaseProps &
  React.ComponentProps<typeof Link> & { disabled?: boolean };

export function ButtonLink({
  variant = "volt",
  size = "md",
  block,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        base,
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        disabled && "opacity-45 pointer-events-none",
        className
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin"
    />
  );
}
