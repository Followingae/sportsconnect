"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  signIn,
  signUp,
  requestPasswordReset,
  updatePassword,
  resendVerification,
  type AuthState,
} from "@/lib/actions/auth";

function Banner({ state }: { state: AuthState }) {
  if (!state?.error && !state?.success) return null;
  const isError = Boolean(state.error);

  return (
    <p
      role="alert"
      className={
        "mb-4 rounded-[12px] px-3.5 py-3 text-[13px] font-semibold " +
        (isError ? "bg-danger-wash text-danger" : "bg-success-wash text-success")
      }
    >
      {state.error ?? state.success}
    </p>
  );
}

export function SignInForm({ next, linkExpired }: { next?: string; linkExpired?: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, null);

  return (
    <form action={action} noValidate>
      <h1 className="text-h1">Welcome back</h1>
      <p className="mt-2.5 text-[15px] text-ink-2">
        Sign in to manage your registrations.
      </p>

      {linkExpired && !state?.error && (
        <p role="alert" className="mt-5 rounded-[12px] bg-warning-wash px-3.5 py-3 text-[13px] font-semibold text-warning">
          That link has expired or was already used. Sign in, or request a new one.
        </p>
      )}

      <div className="mt-6">
        <Banner state={state} />
      </div>

      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>
      </div>

      <Link
        href="/forgot-password"
        className="mt-3 inline-block text-[13.5px] font-bold text-volt-deep"
      >
        Forgot your password?
      </Link>

      <Button type="submit" size="lg" block loading={pending} className="mt-7">
        Sign in
      </Button>

      <p className="mt-5 text-center text-[14px] text-ink-2">
        New here?{" "}
        <Link href="/signup" className="font-bold text-volt-deep">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, null);

  return (
    <form action={action} noValidate>
      <h1 className="text-h1">Create your account</h1>
      <p className="mt-2.5 text-[15px] text-ink-2">
        Register for events across Dubai in a couple of taps.
      </p>

      <div className="mt-6">
        <Banner state={state} />
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Full name" htmlFor="full_name" required>
          <Input id="full_name" name="full_name" autoComplete="name" required placeholder="Zak Rahman" />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <Field
          label="Phone"
          htmlFor="phone"
          hint="Organizers use this to reach you about your event."
        >
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+971 50 123 4567" />
        </Field>
        <Field label="Password" htmlFor="password" required hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
          />
        </Field>
      </div>

      <div className="mt-5">
        <Checkbox
          name="terms"
          label={
            <>
              I accept the{" "}
              <Link href="/legal/terms" className="font-bold text-volt-deep">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="font-bold text-volt-deep">
                privacy policy
              </Link>
              .
            </>
          }
        />
      </div>

      <Button type="submit" size="lg" block loading={pending} className="mt-7">
        Create account
      </Button>

      <p className="mt-5 text-center text-[14px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-volt-deep">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    null
  );

  return (
    <form action={action} noValidate>
      <h1 className="text-h1">Reset your password</h1>
      <p className="mt-2.5 text-[15px] text-ink-2">
        Enter your email and we&apos;ll send you a link to set a new one.
      </p>

      <div className="mt-6">
        <Banner state={state} />
      </div>

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      <Button type="submit" size="lg" block loading={pending} className="mt-7">
        Send reset link
      </Button>

      <p className="mt-5 text-center text-[14px] text-ink-2">
        <Link href="/login" className="font-bold text-volt-deep">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, null);

  return (
    <form action={action} noValidate>
      <h1 className="text-h1">Set a new password</h1>
      <p className="mt-2.5 text-[15px] text-ink-2">
        Choose something you haven&apos;t used here before.
      </p>

      <div className="mt-6">
        <Banner state={state} />
      </div>

      <div className="flex flex-col gap-4">
        <Field label="New password" htmlFor="password" required hint="At least 8 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" required>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      </div>

      <Button type="submit" size="lg" block loading={pending} className="mt-7">
        Update password
      </Button>
    </form>
  );
}

export function ResendVerification({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    resendVerification,
    null
  );

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="email" value={email} />
      <Banner state={state} />
      <Button type="submit" variant="ghost" size="md" loading={pending}>
        Send it again
      </Button>
    </form>
  );
}
