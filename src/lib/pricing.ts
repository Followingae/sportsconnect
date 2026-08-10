import type { Enums } from "@/lib/database.types";

/**
 * BRD §15 + §17. One place computes the money so the consumer review screen,
 * the payment record and the admin's revenue figures can never disagree.
 */

export type FeeConfig = {
  mode: Enums<"fee_mode">;
  fixed_amount: number;
  percentage: number;
};

export type PriceInput = {
  /** Entry fee, per player or per team depending on the event's price_unit. */
  baseAmount: number;
  /** Number of chargeable units — 1 for a team entry, or the headcount. */
  quantity?: number;
  /** Account-level discount granted by a Super Admin, 0–100. */
  discountPercent?: number;
  /** Account credit to spend against this booking. */
  creditAmount?: number;
  /** VAT or similar, applied after discount. */
  taxPercent?: number;
  fee: FeeConfig;
};

export type PriceBreakdown = {
  subtotal: number;
  discount: number;
  creditApplied: number;
  platformFee: number;
  tax: number;
  total: number;
};

/** Money must never carry float dust into the database. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function computePlatformFee(amount: number, fee: FeeConfig): number {
  switch (fee.mode) {
    case "none":
      return 0;
    case "fixed":
      return round2(fee.fixed_amount);
    case "percentage":
      return round2((amount * fee.percentage) / 100);
    case "fixed_plus_percentage":
      return round2(fee.fixed_amount + (amount * fee.percentage) / 100);
    default:
      return 0;
  }
}

export function computePrice(input: PriceInput): PriceBreakdown {
  const {
    baseAmount,
    quantity = 1,
    discountPercent = 0,
    creditAmount = 0,
    taxPercent = 0,
    fee,
  } = input;

  const subtotal = round2(baseAmount * quantity);
  const discount = round2((subtotal * discountPercent) / 100);
  const afterDiscount = round2(subtotal - discount);

  // Platform fee is charged on the discounted entry fee, not the list price —
  // the platform takes its cut of what actually changes hands.
  const platformFee = computePlatformFee(afterDiscount, fee);
  const tax = round2(((afterDiscount + platformFee) * taxPercent) / 100);

  const payableBeforeCredit = round2(afterDiscount + platformFee + tax);
  // Credit can zero a booking but never produce a negative total.
  const creditApplied = round2(Math.min(creditAmount, payableBeforeCredit));

  return {
    subtotal,
    discount,
    creditApplied,
    platformFee,
    tax,
    total: round2(payableBeforeCredit - creditApplied),
  };
}

/**
 * Reference code a consumer quotes in their bank transfer and an admin searches
 * for when reconciling. Deliberately excludes I/O/0/1 so it survives being read
 * aloud or copied off a phone screen.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(sportSlug?: string): string {
  let body = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) body += CODE_ALPHABET[b % CODE_ALPHABET.length];

  const tag = (sportSlug ?? "").slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "");
  return tag ? `SC-${tag}-${body.slice(0, 4)}` : `SC-${body.slice(0, 6)}`;
}
