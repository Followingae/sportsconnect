import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6"
        style={{ paddingTop: "calc(28px + var(--safe-top))", paddingBottom: "calc(32px + var(--safe-bottom))" }}
      >
        <Link
          href="/"
          className="inline-flex items-baseline self-start text-[19px] font-extrabold tracking-[-0.03em]"
        >
          sports<span className="text-volt-word">connect</span>
        </Link>
        <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
      </main>
    </div>
  );
}
