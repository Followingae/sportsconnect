"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";

/**
 * BRD §27: email/password, email verification, password reset.
 * Every action returns `{ error }` for the form to render inline rather than
 * throwing, so a wrong password never costs the user what they typed.
 */

export type AuthState = { error?: string; success?: string } | null;

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords can be at most 72 characters.");

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  email,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  password,
  terms: z.literal("on", {
    errorMap: () => ({ message: "You must accept the terms to continue." }),
  }),
});

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
      // handle_new_user() copies these into public.profiles.
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone || null,
        role: "consumer",
      },
    },
  });

  if (error) {
    // Don't confirm whether an address is already registered — that's an
    // account-enumeration leak. The generic message covers both cases.
    if (error.message.toLowerCase().includes("already")) {
      return {
        error:
          "We couldn't create that account. If you already have one, try signing in or resetting your password.",
      };
    }
    return { error: error.message };
  }

  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Confirm your email address first — check your inbox for the link." };
    }
    return { error: "That email and password don't match. Try again." };
  }

  // Land each role in its own portal.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only same-site paths, and never back to an auth screen — that would bounce
  // the user straight into the form they just completed.
  const wanted = parsed.data.next ?? "";
  const safeNext =
    wanted.startsWith("/") &&
    !wanted.startsWith("//") &&
    !/^\/(login|signup|verify-email|forgot-password|reset-password|auth\/)/.test(wanted)
      ? wanted
      : "";

  let destination = safeNext || "/";

  if (user && !safeNext) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "super_admin") destination = "/admin";
    else if (profile?.role === "event_admin") destination = "/organizer";
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Always report success — whether an address exists is not public information.
  return {
    success:
      "If that address has an account, a reset link is on its way. Check your inbox and spam folder.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, {
      message: "Those passwords don't match.",
      path: ["confirm"],
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/?password=updated");
}

export async function resendVerification(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
  });

  return { success: "Sent again. It can take a minute to arrive." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
