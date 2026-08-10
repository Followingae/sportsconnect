"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * BRD §14 in full: sport, date, price, format, skill, gender, age group,
 * availability, organizer — plus sorting. Filters live in the URL so a
 * filtered list is shareable and survives a refresh.
 */

export type FilterOptions = {
  sports: { slug: string; name: string }[];
  formats: { slug: string; name: string; sport_slug: string }[];
  organizers: { id: string; name: string }[];
};

const SORTS = [
  { value: "date", label: "Date" },
  { value: "recent", label: "Recently added" },
  { value: "deadline", label: "Closing soon" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const DATE_PRESETS = [
  { value: "", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const AGE_GROUPS = [
  { value: "", label: "Any age" },
  { value: "junior", label: "Under 18" },
  { value: "adult", label: "18+" },
  { value: "senior", label: "40+" },
];

export function ExploreFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");

  const get = (k: string) => params.get(k) ?? "";

  function apply(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.push(`/explore?${sp.toString()}`));
  }

  const activeCount = [
    "sport",
    "format",
    "date",
    "priceMax",
    "skill",
    "gender",
    "age",
    "organizer",
    "available",
  ].filter((k) => params.get(k)).length;

  const relevantFormats = options.formats.filter(
    (f) => !get("sport") || f.sport_slug === get("sport")
  );

  return (
    <>
      {/* search + filter trigger */}
      <div className="flex items-center gap-2.5 px-5">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q: query });
          }}
        >
          <Search
            size={17}
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <Input
            aria-label="Search events"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, sports or venues"
            className="pl-11"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                apply({ q: null });
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
            >
              <X size={16} />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Filters${activeCount ? `, ${activeCount} active` : ""}`}
          className={cn(
            "relative grid size-[50px] shrink-0 place-items-center rounded-field",
            activeCount ? "bg-ink text-white" : "bg-soft text-ink"
          )}
        >
          <SlidersHorizontal size={18} aria-hidden />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-volt text-[11px] font-extrabold text-ink">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* quick sport rail */}
      <div className="no-scrollbar mt-3.5 flex gap-2 overflow-x-auto px-5">
        <Chip selected={!get("sport")} onClick={() => apply({ sport: null, format: null })}>
          All sports
        </Chip>
        {options.sports.map((s) => (
          <Chip
            key={s.slug}
            selected={get("sport") === s.slug}
            onClick={() => apply({ sport: s.slug, format: null })}
          >
            {s.name}
          </Chip>
        ))}
      </div>

      {/* active filter summary */}
      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-5">
          {[
            ["date", DATE_PRESETS.find((d) => d.value === get("date"))?.label],
            ["format", options.formats.find((f) => f.slug === get("format"))?.name],
            ["priceMax", get("priceMax") ? `Under ${get("priceMax")}` : null],
            ["skill", get("skill")],
            ["gender", get("gender")],
            ["age", AGE_GROUPS.find((a) => a.value === get("age"))?.label],
            ["organizer", options.organizers.find((o) => o.id === get("organizer"))?.name],
            ["available", get("available") ? "Has places" : null],
          ]
            .filter(([, label]) => Boolean(label))
            .map(([key, label]) => (
              <Chip
                key={key as string}
                selected
                removable
                onRemove={() => apply({ [key as string]: null })}
              >
                {label}
              </Chip>
            ))}
          <button
            type="button"
            onClick={() =>
              apply({
                sport: null, format: null, date: null, priceMax: null, skill: null,
                gender: null, age: null, organizer: null, available: null,
              })
            }
            className="text-[13px] font-bold text-volt-deep"
          >
            Clear all
          </button>
        </div>
      )}

      {/* sort */}
      <div className="mt-3.5 flex items-center justify-between gap-3 px-5">
        <p className="text-[12.5px] text-ink-3" aria-live="polite">
          {pending ? "Updating…" : ""}
        </p>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          Sort
          <Select
            density="outline"
            aria-label="Sort events"
            value={get("sort") || "date"}
            onChange={(e) => apply({ sort: e.target.value })}
            className="w-[168px]"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {/* full filter sheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Filters">
        <div className="flex flex-col gap-5">
          <Field label="Format">
            <Select
              value={get("format")}
              onChange={(e) => apply({ format: e.target.value })}
              disabled={!get("sport")}
            >
              <option value="">{get("sport") ? "Any format" : "Pick a sport first"}</option>
              {relevantFormats.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Date">
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((d) => (
                <Chip
                  key={d.value || "any"}
                  selected={get("date") === d.value}
                  onClick={() => apply({ date: d.value || null })}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Max price" hint="Entry fee per player or per team.">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Any"
              defaultValue={get("priceMax")}
              onBlur={(e) => apply({ priceMax: e.target.value || null })}
            />
          </Field>

          <Field label="Skill level">
            <div className="flex flex-wrap gap-2">
              {["Beginner", "Intermediate", "Advanced"].map((s) => (
                <Chip key={s} selected={get("skill") === s} onClick={() => apply({ skill: get("skill") === s ? null : s })}>
                  {s}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Gender">
            <div className="flex flex-wrap gap-2">
              {[
                ["any", "Any"],
                ["male", "Men"],
                ["female", "Women"],
                ["mixed", "Mixed"],
              ].map(([v, label]) => (
                <Chip
                  key={v}
                  selected={get("gender") === v}
                  onClick={() => apply({ gender: get("gender") === v ? null : v })}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Age group">
            <Select value={get("age")} onChange={(e) => apply({ age: e.target.value })}>
              {AGE_GROUPS.map((a) => (
                <option key={a.value || "any"} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Organizer">
            <Select
              value={get("organizer")}
              onChange={(e) => apply({ organizer: e.target.value })}
            >
              <option value="">Any organizer</option>
              {options.organizers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Availability">
            <Chip
              selected={get("available") === "1"}
              onClick={() => apply({ available: get("available") ? null : "1" })}
            >
              Only show events with places
            </Chip>
          </Field>
        </div>

        <Button size="lg" block className="mt-6" onClick={() => setOpen(false)}>
          Show results
        </Button>
      </BottomSheet>
    </>
  );
}
</content>
