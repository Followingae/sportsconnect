import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getAuditLog } from "@/lib/queries/admin";
import { Panel } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata = { title: "Audit log" };

/** BRD §10/§20 — every important change is recorded and readable here. */
export default async function AuditPage() {
  const entries = await getAuditLog(200);

  const toneFor = (action: string) => {
    if (action.includes("reject") || action.includes("cancel") || action.includes("removed"))
      return "danger" as const;
    if (action.includes("approve") || action.includes("paid")) return "success" as const;
    if (action.includes("grant") || action.includes("permission")) return "info" as const;
    return "neutral" as const;
  };

  return (
    <>
      <PortalHeader crumb="Oversight" title="Audit log" />
      <PortalBody>
        <Panel title="Recent activity" subtitle={`Last ${entries.length} actions`}>
          {entries.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              body="Approvals, payments, grants and participant changes all appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <Avatar name={e.actor?.full_name || e.actor?.email || "System"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px]">
                      <b>{e.actor?.full_name || e.actor?.email || "System"}</b>{" "}
                      <span className="text-ink-2">{e.summary ?? e.action}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {formatDateTime(e.created_at)} · {formatRelative(e.created_at)} ·{" "}
                      {e.entity_type}
                    </p>
                  </div>
                  <Badge tone={toneFor(e.action)}>{e.action.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </PortalBody>
    </>
  );
}
