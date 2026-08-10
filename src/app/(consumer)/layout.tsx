import { BottomNav } from "@/components/consumer/bottom-nav";

/**
 * Consumer shell. Content is capped at a phone-ish measure and centred, so the
 * mobile-first design still reads well on a desktop browser rather than
 * stretching to 1900px.
 */
export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <main
        id="main"
        className="mx-auto w-full max-w-[560px]"
        style={{ paddingBottom: "var(--nav-clearance)" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
