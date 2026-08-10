/**
 * Display formatting. Locale and currency are configurable because the BRD
 * targets Dubai first but does not promise it stays there.
 */

export const DEFAULT_LOCALE = "en-AE";
export const DEFAULT_CURRENCY = "AED";
export const DEFAULT_TZ = "Asia/Dubai";

export function money(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY
): string {
  const n = amount ?? 0;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(n)
    // Intl separates the code with U+00A0; normalise to a plain space so
    // string comparison in search and tests stays predictable.
    .replace(/\u00a0/g, " ");
}

/** Compact money for dense tables: AED 18k */
export function moneyCompact(amount: number, currency = DEFAULT_CURRENCY): string {
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    const k = amount / 1000;
    const s = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    return `${currency} ${s}k`;
  }
  return `${currency} ${amount}`;
}

const dt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(DEFAULT_LOCALE, { timeZone: DEFAULT_TZ, ...opts });

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "15 Sep 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return dt({ day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/** "09:00" */
export function formatTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return dt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** "15 Sep 2026 · 09:00" */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDate(d)} · ${formatTime(d)}`;
}

/**
 * Human day label with a relative shortcut, because "Today 08:00" is what the
 * designs show and it is what people actually scan for.
 */
export function formatDayLabel(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";

  const startOfDay = (x: Date) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const days = Math.round(
    (startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86_400_000
  );

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return dt({ weekday: "long" }).format(d);
  return formatDate(d);
}

/** "Today 08:00" / "15 Sep 2026 09:00" */
export function formatWhen(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDayLabel(d)} ${formatTime(d)}`;
}

/** "in 3 days" / "2 hours ago" */
export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";

  const diff = d.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/** URL-safe slug, with a short random suffix to guarantee uniqueness. */
export function slugify(input: string, withSuffix = true): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  if (!withSuffix) return base || "event";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "event"}-${suffix}`;
}

/** "ZR" from "Zak Rahman" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable avatar colour so the same person is always the same colour. */
export function avatarTone(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return (hash % 7) + 1;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}
