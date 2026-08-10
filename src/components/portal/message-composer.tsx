"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, SegmentedControl } from "@/components/ui/field";
import { useToast } from "@/components/ui/feedback";
import { sendEventMessage } from "@/lib/actions/organizer";
import type { Enums } from "@/lib/database.types";

export function MessageComposer({ eventId }: { eventId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [audience, setAudience] = useState<Enums<"message_audience">>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Panel title="Compose" subtitle="Sends an in-app notification to each recipient">
      <div className="flex flex-col gap-4 px-4 pb-4">
        <Field label="Send to">
          <SegmentedControl
            ariaLabel="Audience"
            value={audience}
            onChange={setAudience}
            options={[
              { value: "all", label: "Everyone" },
              { value: "confirmed", label: "Confirmed" },
              { value: "waitlisted", label: "Waitlist" },
              { value: "unpaid", label: "Unpaid" },
            ]}
          />
        </Field>

        <Field label="Subject" required>
          <Input
            density="outline"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Kick-off moved to 09:30"
          />
        </Field>

        <Field label="Message" required>
          <Textarea
            density="outline"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi all — the first match now starts at 09:30. Please arrive by 09:00 to check in."
          />
        </Field>

        <Button
          icon={<Send size={15} />}
          loading={busy}
          disabled={!subject.trim() || !body.trim()}
          onClick={async () => {
            setBusy(true);
            const res = await sendEventMessage(eventId, audience, subject, body);
            setBusy(false);
            if (!res.ok) {
              toast(res.error, "danger");
              return;
            }
            setSubject("");
            setBody("");
            toast(`Sent to ${res.data.recipients} recipient(s)`, "success");
            router.refresh();
          }}
        >
          Send message
        </Button>
      </div>
    </Panel>
  );
}
