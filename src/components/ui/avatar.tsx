import * as React from "react";
import { cn } from "@/lib/cn";
import { avatarTone, initials } from "@/lib/format";

const TONE_BG = [
  "", // 1-indexed
  "bg-av-1",
  "bg-av-2",
  "bg-av-3",
  "bg-av-4",
  "bg-av-5",
  "bg-av-6",
  "bg-av-7",
];

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-[30px] text-[12px]",
  md: "size-[38px] text-[13px]",
  lg: "size-[46px] text-[16px]",
  xl: "size-[82px] text-[32px]",
} as const;

export function Avatar({
  name,
  src,
  size = "sm",
  ring = false,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
}) {
  const tone = TONE_BG[avatarTone(name || "?")];

  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "font-extrabold text-white",
        SIZES[size],
        !src && tone,
        ring && "border-[2.5px] border-white",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      {src && <span className="sr-only">{name}</span>}
    </span>
  );
}

/** Overlapping "who's playing" row with a +N overflow chip. */
export function AvatarStack({
  people,
  max = 3,
  size = "sm",
  className,
}: {
  people: { name: string; avatar_url?: string | null }[];
  max?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((p, i) => (
        <Avatar
          key={`${p.name}-${i}`}
          name={p.name}
          src={p.avatar_url}
          size={size}
          ring
          className={i > 0 ? "-ml-2.5" : undefined}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "-ml-2.5 inline-flex items-center justify-center rounded-full",
            "border-[2.5px] border-white bg-soft font-extrabold text-ink-2",
            SIZES[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
