import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getSportsWithFormats, getFeeConfig } from "@/lib/queries/admin";
import { SportsManager, type SportRow } from "@/components/portal/sports-manager";
import { FeeConfigPanel } from "@/components/portal/fee-config";
import type { Enums } from "@/lib/database.types";

export const metadata = { title: "Sports & formats" };

export default async function SportsPage() {
  const [sports, fees] = await Promise.all([getSportsWithFormats(), getFeeConfig()]);
  const global = fees.find((f) => f.scope === "global");

  return (
    <>
      <PortalHeader crumb="Catalogue" title="Sports & formats" />
      <PortalBody>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <SportsManager sports={sports as unknown as SportRow[]} />
          <FeeConfigPanel
            initial={{
              mode: (global?.mode ?? "percentage") as Enums<"fee_mode">,
              fixed_amount: Number(global?.fixed_amount ?? 0),
              percentage: Number(global?.percentage ?? 5),
            }}
          />
        </div>
      </PortalBody>
    </>
  );
}
