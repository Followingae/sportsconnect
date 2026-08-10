"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Every image slot in the product goes through this. Brief §11: image slots
 * must have a graceful overlay + skeleton and look good before real photos
 * arrive. It handles three states — loading, loaded, and no-image/error — and
 * always applies a scrim so white type stays legible over any photograph.
 */
export function Cover({
  src,
  alt,
  scrim = "bottom",
  sizes = "100vw",
  priority,
  rounded,
  className,
  children,
  fallbackLabel,
}: {
  src?: string | null;
  alt: string;
  scrim?: "bottom" | "full" | "soft" | "none";
  sizes?: string;
  priority?: boolean;
  rounded?: string;
  className?: string;
  children?: React.ReactNode;
  /** Big ghost letter shown when there's no photo — the designs' "P" motif. */
  fallbackLabel?: string;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-ink",
        rounded ?? "rounded-card",
        className
      )}
    >
      {/* Placeholder sits underneath and is revealed whenever there is no
          usable photo, so there is never a raw grey box. */}
      {(!showImage || !loaded) && (
        <div
          className={cn(
            "absolute inset-0",
            showImage ? "skeleton" : "bg-gradient-to-br from-[#2a2f38] to-[#14161a]"
          )}
          aria-hidden
        >
          {!showImage && fallbackLabel && (
            <span className="absolute -bottom-[18%] -right-[8%] select-none text-[clamp(90px,42cqw,240px)] font-black leading-[0.66] text-white/10">
              {fallbackLabel}
            </span>
          )}
        </div>
      )}

      {showImage && (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "object-cover transition-opacity duration-[var(--duration-slow)]",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {scrim !== "none" && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0",
            scrim === "bottom" && "scrim-bottom",
            scrim === "full" && "scrim-full",
            scrim === "soft" && "scrim-soft"
          )}
        />
      )}

      {children && <div className="relative h-full w-full">{children}</div>}
    </div>
  );
}
