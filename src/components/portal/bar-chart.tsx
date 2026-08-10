import { cn } from "@/lib/cn";

/**
 * Small server-rendered bar chart. No charting library — these are six-bar
 * summaries, and a dependency would cost more than it earns.
 */
export function BarChart({
  data,
  height = 130,
  format = (v: number) => String(v),
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  className?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="px-4 pb-4 text-[13px] text-ink-3">Not enough data yet.</p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("px-4 pb-4 pt-1", className)}>
      <div className="flex items-end gap-2.5" style={{ height }}>
        {data.map((d) => {
          // Give a non-zero value at least a sliver so it never reads as absent.
          const pct = d.value === 0 ? 0 : Math.max(4, (d.value / max) * 100);
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold tabular-nums text-ink-2">
                {d.value > 0 ? format(d.value) : ""}
              </span>
              <div
                className="w-full rounded-t-[6px] bg-gradient-to-b from-volt to-volt-grad"
                style={{ height: `${pct}%` }}
                role="img"
                aria-label={`${d.label}: ${format(d.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2.5">
        {data.map((d) => (
          <span
            key={d.label}
            className="flex-1 truncate text-center text-[10.5px] font-semibold text-ink-3"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
