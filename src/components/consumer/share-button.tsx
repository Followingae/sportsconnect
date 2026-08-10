"use client";

import { useState } from "react";
import { Share2, Check, Link as LinkIcon, MessageCircle } from "lucide-react";
import { BottomSheet } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/feedback";

/**
 * Share is the growth loop — the link has to be one tap to WhatsApp. Uses the
 * native share sheet where the browser has one, and falls back to a bottom
 * sheet with copy + WhatsApp everywhere else.
 */
export function ShareButton({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

  async function onShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed the native sheet, or it isn't permitted here — fall
        // through to our own sheet rather than doing nothing.
      }
    }
    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copied", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy — select the link and copy it manually", "danger");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onShare}
        aria-label="Share this event"
        className={className}
      >
        <Share2 size={17} aria-hidden />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share this event"
        description="Anyone with the link lands straight on the registration page."
      >
        <div className="flex items-center justify-between gap-3 rounded-field bg-soft px-4 py-3.5">
          <span className="min-w-0 truncate text-[13px]">{url}</span>
          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-volt-deep"
          >
            {copied ? <Check size={14} aria-hidden /> : <LinkIcon size={14} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-3 block">
          <Button variant="whatsapp" size="lg" block icon={<MessageCircle size={18} />}>
            Share on WhatsApp
          </Button>
        </a>
      </BottomSheet>
    </>
  );
}
