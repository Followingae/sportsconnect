import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/forms";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // Reaching this page means the recovery link already established a session
  // via /auth/callback. Without one there is nothing to update.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/forgot-password");

  return <ResetPasswordForm />;
}
