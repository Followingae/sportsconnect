import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";
import type { FeeConfig } from "@/lib/pricing";

/** Platform settings are a singleton row. Cached per request by React. */
export async function getPlatformSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("*").eq("id", true).single();
  return data;
}

/**
 * Resolve the fee that applies to an event: event override → sport override →
 * global default. BRD §17.
 */
export async function resolveFee(
  eventId?: string,
  sportId?: string
): Promise<FeeConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_fee_config")
    .select("scope, mode, fixed_amount, percentage, sport_id, event_id")
    .eq("is_active", true);

  const rows = data ?? [];
  const pick =
    (eventId && rows.find((r) => r.scope === "event" && r.event_id === eventId)) ||
    (sportId && rows.find((r) => r.scope === "sport" && r.sport_id === sportId)) ||
    rows.find((r) => r.scope === "global");

  if (!pick) return { mode: "none", fixed_amount: 0, percentage: 0 };
  return {
    mode: pick.mode,
    fixed_amount: Number(pick.fixed_amount),
    percentage: Number(pick.percentage),
  };
}

/** Which payment methods the UI is allowed to offer (D3). */
export async function getEnabledPaymentMethods(): Promise<Enums<"payment_method">[]> {
  const settings = await getPlatformSettings();
  return settings?.payment_methods_enabled ?? ["bank_transfer", "cash_at_venue"];
}

/** Account-level perks a Super Admin granted this consumer (design P4). */
export async function getAccountPerks(userId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [credits, discounts] = await Promise.all([
    supabase
      .from("account_credits")
      .select("amount, expires_at")
      .eq("user_id", userId)
      .or(`expires_at.is.null,expires_at.gt.${now}`),
    supabase
      .from("account_discounts")
      .select("percent, expires_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`),
  ]);

  const creditTotal = (credits.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0);
  // If several discounts are granted, the consumer gets the best one — never stacked.
  const bestDiscount = (discounts.data ?? []).reduce(
    (max, d) => Math.max(max, Number(d.percent)),
    0
  );

  return { creditTotal, discountPercent: bestDiscount };
}
