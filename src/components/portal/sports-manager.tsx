"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { Field, Input, Select, Checkbox } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/components/ui/chip";
import { Cover } from "@/components/ui/cover";
import { useToast } from "@/components/ui/feedback";
import { upsertSport, upsertFormat } from "@/lib/actions/admin";
import { slugify } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export type SportRow = {
  id: string;
  slug: string;
  name: string;
  cover_url: string | null;
  is_active: boolean;
  sort_order: number;
  eventCount: number;
  formats: {
    id: string;
    slug: string;
    name: string;
    registration_model: Enums<"registration_model">;
    default_team_size: number | null;
    default_substitutes: number;
    is_active: boolean;
  }[];
};

export function SportsManager({ sports }: { sports: SportRow[] }) {
  const router = useRouter();
  const [sportModal, setSportModal] = useState<SportRow | "new" | null>(null);
  const [formatFor, setFormatFor] = useState<{
    sport: SportRow;
    format: SportRow["formats"][number] | null;
  } | null>(null);

  return (
    <>
      <Panel
        title="Sports"
        subtitle={`${sports.length} configured`}
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setSportModal("new")}>
            Add sport
          </Button>
        }
      >
        <ul className="divide-y divide-line">
          {sports.map((s) => (
            <li key={s.id} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Cover
                  src={s.cover_url}
                  alt=""
                  scrim="none"
                  sizes="40px"
                  rounded="rounded-[9px]"
                  fallbackLabel={s.name[0]}
                  className="size-[34px] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-extrabold">{s.name}</p>
                  <p className="truncate text-[11px] text-ink-3">
                    {s.formats.length} format(s) · {s.eventCount} event(s)
                  </p>
                </div>
                <Badge tone={s.is_active ? "volt" : "neutral"}>
                  {s.is_active ? "Active" : "Hidden"}
                </Badge>
                <button
                  type="button"
                  onClick={() => setSportModal(s)}
                  aria-label={`Edit ${s.name}`}
                  className="rounded-[8px] p-1.5 text-ink-3 hover:bg-soft hover:text-ink"
                >
                  <Pencil size={15} aria-hidden />
                </button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {s.formats.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFormatFor({ sport: s, format: f })}>
                    <Tag tone={f.is_active ? "soft" : "outline"}>
                      {f.name}
                      <span className="text-ink-3">
                        {f.registration_model === "team"
                          ? ` · ${f.default_team_size ?? "?"}${f.default_substitutes ? `+${f.default_substitutes}` : ""}`
                          : " · solo"}
                      </span>
                    </Tag>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormatFor({ sport: s, format: null })}
                  className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[11.5px] font-bold text-ink-2"
                >
                  + Format
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {sportModal && (
        <SportModal
          sport={sportModal === "new" ? null : sportModal}
          nextOrder={sports.length + 1}
          onClose={() => setSportModal(null)}
          onDone={() => {
            setSportModal(null);
            router.refresh();
          }}
        />
      )}

      {formatFor && (
        <FormatModal
          sport={formatFor.sport}
          format={formatFor.format}
          onClose={() => setFormatFor(null)}
          onDone={() => {
            setFormatFor(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SportModal({
  sport,
  nextOrder,
  onClose,
  onDone,
}: {
  sport: SportRow | null;
  nextOrder: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(sport?.name ?? "");
  const [slug, setSlug] = useState(sport?.slug ?? "");
  const [cover, setCover] = useState(sport?.cover_url ?? "");
  const [active, setActive] = useState(sport?.is_active ?? true);
  const [order, setOrder] = useState(String(sport?.sort_order ?? nextOrder));

  return (
    <Modal
      open
      onClose={onClose}
      title={sport ? `Edit ${sport.name}` : "Add sport"}
      width={440}
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
              const res = await upsertSport({
                id: sport?.id,
                name,
                slug: slug || slugify(name, false),
                cover_url: cover,
                is_active: active,
                sort_order: Number(order) || 0,
              });
              setBusy(false);
              if (!res.ok) {
                toast(res.error, "danger");
                return;
              }
              toast("Sport saved", "success");
              onDone();
            }}
          >
            Save sport
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5">
        <Field label="Name" required>
          <Input
            density="outline"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!sport) setSlug(slugify(e.target.value, false));
            }}
            placeholder="Volleyball"
          />
        </Field>
        <Field label="Slug" required hint="Used in URLs. Lowercase, no spaces.">
          <Input density="outline" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="Cover image URL" hint="Shown on the landing page and event cards.">
          <Input
            density="outline"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="/covers/volleyball.webp"
          />
        </Field>
        <Field label="Sort order">
          <Input
            density="outline"
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </Field>
        <Checkbox
          label="Active"
          description="Hidden sports don't appear to consumers or in the builder."
          checked={active}
          onChange={(e) => setActive(e.currentTarget.checked)}
        />
      </div>
    </Modal>
  );
}

function FormatModal({
  sport,
  format,
  onClose,
  onDone,
}: {
  sport: SportRow;
  format: SportRow["formats"][number] | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(format?.name ?? "");
  const [slug, setSlug] = useState(format?.slug ?? "");
  const [model, setModel] = useState<Enums<"registration_model">>(
    format?.registration_model ?? "team"
  );
  const [size, setSize] = useState(String(format?.default_team_size ?? 2));
  const [subs, setSubs] = useState(String(format?.default_substitutes ?? 0));
  const [active, setActive] = useState(format?.is_active ?? true);

  return (
    <Modal
      open
      onClose={onClose}
      title={format ? `Edit ${format.name}` : `Add format to ${sport.name}`}
      width={440}
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
              const res = await upsertFormat({
                id: format?.id,
                sport_id: sport.id,
                name,
                slug: slug || slugify(name, false),
                registration_model: model,
                default_team_size: model === "team" ? Number(size) || null : 1,
                default_substitutes: model === "team" ? Number(subs) || 0 : 0,
                is_active: active,
              });
              setBusy(false);
              if (!res.ok) {
                toast(res.error, "danger");
                return;
              }
              toast("Format saved", "success");
              onDone();
            }}
          >
            Save format
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5">
        <Field label="Name" required>
          <Input
            density="outline"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!format) setSlug(slugify(e.target.value, false));
            }}
            placeholder="6-a-side"
          />
        </Field>
        <Field label="Slug" required>
          <Input density="outline" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="Registration model" hint="Drives whether the builder asks for squads.">
          <Select
            density="outline"
            value={model}
            onChange={(e) => setModel(e.target.value as Enums<"registration_model">)}
          >
            <option value="team">Team</option>
            <option value="individual">Individual</option>
          </Select>
        </Field>
        {model === "team" && (
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Default team size">
              <Input
                density="outline"
                type="number"
                min={1}
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </Field>
            <Field label="Default substitutes">
              <Input
                density="outline"
                type="number"
                min={0}
                value={subs}
                onChange={(e) => setSubs(e.target.value)}
              />
            </Field>
          </div>
        )}
        <Checkbox
          label="Active"
          checked={active}
          onChange={(e) => setActive(e.currentTarget.checked)}
        />
      </div>
    </Modal>
  );
}
