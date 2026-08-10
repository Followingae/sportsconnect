import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center px-6 text-center"
    >
      <div className="grid size-16 place-items-center rounded-full bg-danger-wash text-[24px] text-danger">
        ⃠
      </div>
      <h1 className="mt-6 text-h1">You don&apos;t have access to this portal</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Your account isn&apos;t authorised for this area, or it has been deactivated. If you
        think that&apos;s wrong, ask a Super Admin to check your role and permissions.
      </p>
      <div className="mt-7 flex gap-3">
        <ButtonLink href="/" variant="ghost" size="md">
          Go to Sportsconnect
        </ButtonLink>
        <ButtonLink href="/login" size="md">
          Sign in as someone else
        </ButtonLink>
      </div>
    </main>
  );
}
