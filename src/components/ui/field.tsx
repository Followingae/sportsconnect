"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/* ---------------------------------------------------------------------------
   Field wrapper — label, required marker, hint and error in one place so every
   form in all three portals reports validation identically.
--------------------------------------------------------------------------- */

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-[12px] font-bold text-ink-2"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[12px] font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Inputs. Two densities: `soft` (filled, consumer mobile) and `outline`
   (bordered, back-office) — both from the handoff.
--------------------------------------------------------------------------- */

type Density = "soft" | "outline";

const inputBase =
  "w-full text-[15px] text-ink placeholder:text-ink-3 outline-none " +
  "transition-shadow duration-[var(--duration-fast)] disabled:opacity-50";

const DENSITY: Record<Density, string> = {
  soft: "bg-soft rounded-field px-4 py-[15px] border border-transparent focus:border-ink",
  outline:
    "bg-white rounded-input px-3.5 py-[11px] text-[13px] border border-line-strong focus:border-ink",
};

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { density?: Density; invalid?: boolean }
>(function Input({ density = "soft", invalid, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        inputBase,
        DENSITY[density],
        invalid && "border-danger focus:border-danger",
        className
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    density?: Density;
    invalid?: boolean;
  }
>(function Textarea({ density = "soft", invalid, className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        inputBase,
        DENSITY[density],
        "resize-y leading-relaxed",
        invalid && "border-danger focus:border-danger",
        className
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    density?: Density;
    invalid?: boolean;
  }
>(function Select({ density = "soft", invalid, className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          DENSITY[density],
          "cursor-pointer appearance-none pr-9",
          invalid && "border-danger focus:border-danger",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-3"
      >
        ▾
      </span>
    </div>
  );
});

/* ---------------------------------------------------------------------------
   Choice controls
--------------------------------------------------------------------------- */

export function Checkbox({
  label,
  description,
  className,
  ...props
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = React.useId();
  return (
    <label
      htmlFor={props.id ?? id}
      className={cn("flex cursor-pointer items-start gap-2.5", className)}
    >
      <input
        type="checkbox"
        id={props.id ?? id}
        className="peer sr-only"
        {...props}
      />
      {/* The tick lives on this element, not a child: Tailwind's `peer-*`
          variants only match siblings of the peer input. */}
      <span
        aria-hidden
        className={cn(
          "mt-px grid size-5 shrink-0 place-items-center rounded-[6px] border-2 border-line-strong",
          "text-[12px] font-extrabold text-transparent transition-colors",
          "peer-checked:border-volt peer-checked:bg-volt peer-checked:text-ink",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
        )}
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[12px] text-ink-3">{description}</span>
        )}
      </span>
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-[34px] shrink-0 rounded-full transition-colors duration-[var(--duration-fast)]",
        checked ? "bg-volt" : "bg-line-strong",
        disabled && "opacity-45",
        className
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full transition-all duration-[var(--duration-fast)]",
          checked ? "left-[16px] bg-ink" : "left-0.5 bg-white"
        )}
      />
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: React.ReactNode; disabled?: boolean }[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex gap-0.5 rounded-input bg-soft p-[3px]", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
              active ? "bg-white text-ink shadow-[0_1px_3px_rgba(20,22,26,.1)]" : "text-ink-2",
              o.disabled && "opacity-40"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Big-touch-target number picker used for spots, team size, substitutes. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  suffix,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
  suffix?: string;
  className?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-field bg-soft px-4 py-3",
        className
      )}
    >
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="grid size-[34px] place-items-center rounded-[10px] bg-white text-[20px] leading-none disabled:opacity-40"
      >
        −
      </button>
      <span className="text-[22px] font-black tabular-nums" aria-live="polite">
        {value}
        {suffix && <span className="ml-1 text-[13px] font-semibold text-ink-3">{suffix}</span>}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className="grid size-[34px] place-items-center rounded-[10px] bg-volt text-[20px] leading-none text-ink disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
