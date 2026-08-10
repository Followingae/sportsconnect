import { notFound } from "next/navigation";
import { PortalBody } from "@/components/portal/shell";
import {
  getEventMessages,
  getOrganizerContext,
  getOrganizerEvent,
} from "@/lib/queries/organizer";
import { MessageComposer } from "@/components/portal/message-composer";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatDateTime, pluralize } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, ctx, messages] = await Promise.all([
    getOrganizerEvent(id),
    getOrganizerContext(),
    getEventMessages(id),
  ]);
  if (!event) notFound();

  const canSend = Boolean(ctx?.can("send_notifications"));

  return (
    <PortalBody>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {canSend ? (
          <MessageComposer eventId={id} />
        ) : (
          <Panel title="Compose">
            <p className="px-4 pb-4 text-[13px] text-ink-2">
              Your account doesn&apos;t have the &ldquo;Send notifications&rdquo;
              permission. Ask a Super Admin to grant it.
            </p>
          </Panel>
        )}

        <Panel title="Sent" subtitle={pluralize(messages.length, "message")}>
          {messages.length === 0 ? (
            <EmptyState
              title="Nothing sent yet"
              body="Messages you send appear here, with who received them."
            />
          ) : (
            <ul className="divide-y divide-line">
              {messages.map((m) => (
                <li key={m.id} className="px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[13.5px] font-extrabold">{m.subject}</p>
                    <span className="shrink-0 text-[11px] text-ink-3">
                      {formatDateTime(m.sent_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-2">
                    {m.body}
                  </p>
                  <p className="mt-1.5 text-[11px] text-ink-3">
                    To {m.audience} · {pluralize(m.recipient_count, "recipient")}
                    {m.sender?.full_name ? ` · ${m.sender.full_name}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PortalBody>
  );
}
