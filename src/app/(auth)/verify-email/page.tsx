import Link from "next/link";
import { Mail } from "lucide-react";
import { ResendVerification } from "@/components/auth/forms";

export const metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div>
      <div className="grid size-14 place-items-center rounded-full bg-volt text-ink">
        <Mail size={24} aria-hidden />
      </div>

      <h1 className="mt-6 text-h1">Check your email</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        We sent a confirmation link
        {email ? (
          <>
            {" "}
            to <strong className="text-ink">{email}</strong>
          </>
        ) : null}
        . Open it to finish setting up your account.
      </p>
      <p className="mt-3 text-[13.5px] text-ink-3">
        Nothing yet? It can take a minute, and it sometimes lands in spam.
      </p>

      {email && <ResendVerification email={email} />}

      <p className="mt-8 text-[14px] text-ink-2">
        Wrong address?{" "}
        <Link href="/signup" className="font-bold text-volt-deep">
          Sign up again
        </Link>
      </p>
    </div>
  );
}
