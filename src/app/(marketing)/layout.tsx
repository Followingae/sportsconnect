/**
 * The marketing site has its own visual world — deep navy ground, volt accent,
 * italic display type — deliberately distinct from the app's white/ink surface.
 * Its tokens are scoped here rather than added to the global theme so the two
 * identities can't bleed into each other.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing min-h-dvh bg-navy text-cream">
      <main id="main">{children}</main>
    </div>
  );
}
