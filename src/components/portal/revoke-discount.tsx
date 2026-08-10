"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/feedback";
import { revokeDiscount } from "@/lib/actions/admin";

export function RevokeDiscountButton({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await revokeDiscount(id);
        setBusy(false);
        toast(res.ok ? "Discount revoked" : res.error, res.ok ? "success" : "danger");
        if (res.ok) router.refresh();
      }}
      className="shrink-0 rounded-btn-sm border border-line-strong px-2.5 py-1 text-[11.5px] font-bold text-danger disabled:opacity-50"
    >
      Revoke
    </button>
  );
}
