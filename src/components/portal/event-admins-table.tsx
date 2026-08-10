"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, KeyRound } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/overlay";
import { Field, Input, Checkbox } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, useToast } from "@/components/ui/feedback";
import {
  createEventAdmin,
  setAdminPermissions,
  setAccountStatus,
} from "@/lib/actions/admin";
import { PERMISSIONS, DEFAULT_PERMISSIONS } from "@/lib/status";
import { formatDate } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export type AdminRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: Enums<"account_status">;
  created_at: string;
  organization: { id: string; name: string } | null;
  permissions: string[];
  eventCount: number;
};

export function EventAdminsTable({ rows }: { rows: AdminRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [permsFor, setPermsFor] = useState<AdminRow | null>(null);
  const [statusFor, setStatusFor] = useState<AdminRow | null>(null);
  const [busy, setBusy] = useState(false);

  const columns: Column<AdminRow>[] = [
    {
      key: "admin",
      header: "Admin",
      width: "2fr",
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={a.full_name || a.email} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-bold">{a.full_name || "Unnamed"}</div>
            <div className="truncate text-[11px] text-ink-3">{a.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "org",
      header: "Organization",
      width: "1.4fr",
      render: (a) => <span className="text-ink-2">{a.organization?.name ?? "—"}</span>,
    },
    {
      key: "events",
      header: "Events",
      width: "0.8fr",
      render: (a) => <span className="text-ink-2 tabular-nums">{a.eventCount}</span>,
    },
    {
      key: "perms",
      header: "Permissions",
      width: "1fr",
      render: (a) => (
        <span className="text-ink-2 tabular-nums">
          {a.permissions.length} / {PERMISSIONS.length}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (a) => (
        <Badge tone={a.status === "active" ? "success" : "neutral"} dot>
          {a.status === "active" ? "Active" : a.status === "inactive" ? "Inactive" : "Suspended"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "1.6fr",
      align: "right",
      render: (a) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setPermsFor(a)}
            className="rounded-btn-sm border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold"
          >
            Permissions
          </button>
          <button
            type="button"
            onClick={() => setStatusFor(a)}
            className="rounded-btn-sm border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold"
          >
            {a.status === "active" ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-2">
          {rows.length} admin(s) · {rows.filter((r) => r.status === "active").length} active
        </p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          Create admin
        </Button>
      </div>

      <DataTable
        caption="Event Admins"
        columns={columns}
        rows={rows}
        keyOf={(a) => a.id}
        empty={
          <EmptyState
            title="No Event Admins yet"
            body="Create one and they'll get an email to set their password."
            actionLabel="Create admin"
            onAction={() => setCreateOpen(true)}
          />
        }
      />

      {createOpen && (
        <CreateAdminModal
          onClose={() => setCreateOpen(false)}
          onDone={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      )}

      {permsFor && (
        <PermissionsModal
          admin={permsFor}
          onClose={() => setPermsFor(null)}
          onDone={() => {
            setPermsFor(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(statusFor)}
        onClose={() => setStatusFor(null)}
        busy={busy}
        destructive={statusFor?.status === "active"}
        title={
          statusFor?.status === "active"
            ? `Deactivate ${statusFor?.full_name}?`
            : `Reactivate ${statusFor?.full_name}?`
        }
        confirmLabel={statusFor?.status === "active" ? "Deactivate" : "Reactivate"}
        body={
          statusFor?.status === "active"
            ? "They lose access to the organizer portal immediately. Their events stay live and unchanged."
            : "They regain access to the organizer portal with their existing permissions."
        }
        onConfirm={async () => {
          if (!statusFor) return;
          setBusy(true);
          const res = await setAccountStatus(
            statusFor.id,
            statusFor.status === "active" ? "inactive" : "active"
          );
          setBusy(false);
          setStatusFor(null);
          toast(res.ok ? "Updated" : res.error, res.ok ? "success" : "danger");
          if (res.ok) router.refresh();
        }}
      />
    </>
  );
}

function CreateAdminModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    organization: "",
  });
  const [perms, setPerms] = useState<string[]>([...DEFAULT_PERMISSIONS]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Create Event Admin"
      description="They receive an email to set their own password"
      width={520}
      footer={
        <>
          <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            className="flex-[2]"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await createEventAdmin({ ...form, permissions: perms });
              setBusy(false);
              if (!res.ok) {
                toast(res.error, "danger");
                return;
              }
              toast("Admin created, password email sent", "success");
              onDone();
            }}
          >
            Create &amp; invite
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5 md:grid-cols-2">
        <Field label="Full name" required>
          <Input
            density="outline"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Omar Haddad"
          />
        </Field>
        <Field label="Email" required>
          <Input
            density="outline"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="omar@padelpro.ae"
          />
        </Field>
        <Field label="Phone">
          <Input
            density="outline"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+971 …"
          />
        </Field>
        <Field label="Organization" required>
          <Input
            density="outline"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            placeholder="Padel Pro"
          />
        </Field>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[12px] font-bold text-ink-2">Permissions</p>
        <div className="grid gap-2 md:grid-cols-2">
          {PERMISSIONS.map((p) => (
            <Checkbox
              key={p.key}
              label={p.label}
              checked={perms.includes(p.key)}
              onChange={(e) =>
                setPerms(
                  e.currentTarget.checked
                    ? [...perms, p.key]
                    : perms.filter((x) => x !== p.key)
                )
              }
            />
          ))}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-3">
        <KeyRound size={13} aria-hidden className="mt-0.5 shrink-0" />
        A random password is set and a reset email is sent immediately, so nobody but
        them ever knows their credentials.
      </p>
    </Modal>
  );
}

function PermissionsModal({
  admin,
  onClose,
  onDone,
}: {
  admin: AdminRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [perms, setPerms] = useState<string[]>(admin.permissions);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${admin.full_name}'s permissions`}
      description="Configurable per admin, not hard-coded to the role"
      width={480}
      footer={
        <>
          <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            className="flex-[2]"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await setAdminPermissions(admin.id, perms);
              setBusy(false);
              if (!res.ok) {
                toast(res.error, "danger");
                return;
              }
              toast("Permissions saved", "success");
              onDone();
            }}
          >
            Save permissions
          </Button>
        </>
      }
    >
      <div className="grid gap-2 md:grid-cols-2">
        {PERMISSIONS.map((p) => (
          <Checkbox
            key={p.key}
            label={p.label}
            checked={perms.includes(p.key)}
            onChange={(e) =>
              setPerms(
                e.currentTarget.checked ? [...perms, p.key] : perms.filter((x) => x !== p.key)
              )
            }
          />
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        Removing a permission takes effect on their next request. Payments are view-only
        for every Event Admin — only a Super Admin can mark money received.
      </p>
      <p className="mt-2 text-[11.5px] text-ink-3">
        Joined {formatDate(admin.created_at)}
      </p>
    </Modal>
  );
}
