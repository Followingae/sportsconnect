"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/profile");
}

/**
 * Fan-out helper used by the organizer and admin portals. Notifications are
 * written to the table here; email delivery is a later phase (BRD §25 allows
 * email first, SMS/WhatsApp later).
 */
export async function notifyUsers(
  userIds: string[],
  payload: { type: string; title: string; body?: string; link?: string }
) {
  if (userIds.length === 0) return;
  const supabase = await createClient();

  await supabase.from("notifications").insert(
    userIds.map((user_id) => ({
      user_id,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
    }))
  );
}
