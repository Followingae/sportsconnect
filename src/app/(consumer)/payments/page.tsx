import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, Receipt, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyPayments } from "@/lib/queries/my";
import { getAccountPerks } from "@/lib/queries/settings";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { Card, Divider } from "@/components/ui/card";
import { PaymentStatusBadge, RefundStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { money, formatDate } from "@/lib/format";
import { PAYMENT_METHOD } from "@/lib/status";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/payments");

  const [{ payments, refunds }, perks] = await Promise.all([
    getMyPayments(user.id),
    getAccountPerks(user.id),
  ]);

  const outstanding = payments
    .filter((p) => ["pending", "processing"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.total_amount), 0);

  return (
    <div>
      <header className="px-5 pt-4">
        <h1 className="text-h2">Payments</h1>
      </header>

      {/* account perks — the ink card from the designs */}
      {(perks.creditTotal > 0 || perks.discountPercent > 0) && (
        <section className="mx-5 mt-4 flex items-center justify-between gap-4 rounded-card-lg bg-ink p-[18px] text-white">
          <div>
            <p className="text-[12px] text-ink-inverse">Account credit</p>
            <p className="mt-0.5 text-[24px] font-black text-volt tabular-nums">
              {money(perks.creditTotal)}
            </p>
          </div>
          {perks.discountPercent > 0 && (
            <p className="max-w-[120px] text-right text-[11.5px] text-ink-inverse">
              plus {perks.discountPercent}% member discount
            </p>
          )}
        </section>
      )}

      {outstanding > 0 && (
        <p className="mx-5 mt-4 rounded-[12px] bg-warning-wash px-3.5 py-3 text-[12.5px] font-semibold text-warning">
          {money(outstanding)} outstanding across{" "}
          {payments.filter((p) => ["pending", "processing"].includes(p.status)).length}{" "}
          registration(s). Your places are held until each event&apos;s registration closes.
        </p>
      )}

      {/* payment history */}
      <section className="mt-6 px-5">
        <h2 className="text-h3">History</h2>

        {payments.length === 0 ? (
          <EmptyState
            icon={<Wallet size={22} />}
            title="No payments yet"
            body="When you register for an event, the amount and reference show up here."
            actionLabel="Explore events"
            actionHref="/explore"
          />
        ) : (
          <Card className="mt-3 p-0">
            {payments.map((p, i) => (
              <div key={p.id} id={p.reference_code}>
                {i > 0 && <Divider className="mx-4" />}
                <div className="flex items-center gap-3 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-soft text-ink-2">
                    <Receipt size={16} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={p.event ? `/e/${p.event.slug}` : "#"}
                      className="block truncate text-[14px] font-extrabold"
                    >
                      {p.event?.name ?? "Event"}
                    </Link>
                    <p className="mt-0.5 truncate text-[12px] text-ink-3">
                      {formatDate(p.created_at)} · {p.reference_code} ·{" "}
                      {PAYMENT_METHOD[p.method].label}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13.5px] font-bold tabular-nums">
                      {money(p.total_amount, p.currency)}
                    </p>
                    <div className="mt-1">
                      <PaymentStatusBadge status={p.status} dot={false} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* refunds */}
      {refunds.length > 0 && (
        <section className="mt-7 px-5">
          <h2 className="text-h3">Refunds</h2>
          <Card className="mt-3 p-0">
            {refunds.map((r, i) => (
              <div key={r.id}>
                {i > 0 && <Divider className="mx-4" />}
                <div className="flex items-center gap-3 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-soft text-ink-2">
                    <Undo2 size={16} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold">
                      {r.registration?.event?.name ?? "Event"}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-3">
                      Requested {formatDate(r.created_at)}
                      {r.reason ? ` · ${r.reason}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13.5px] font-bold tabular-nums">
                      {money(r.amount, r.currency)}
                    </p>
                    <div className="mt-1">
                      <RefundStatusBadge status={r.status} dot={false} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <p className="mx-5 mt-6 text-[12px] leading-relaxed text-ink-3">
        Card payments are coming soon. For now every registration is settled by bank
        transfer or cash at the venue, and confirmed manually once the money is received.
      </p>
    </div>
  );
}
