/**
 * Shown when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Better than a stack
 * trace, and tells whoever hits it exactly what to do.
 */
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-[440px] px-6 py-20 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-warning-wash text-[22px] text-warning">
        !
      </div>
      <h1 className="mt-5 text-h2">Supabase keys are missing</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
        The database is provisioned but this deployment has no API keys, so it can&apos;t
        read anything yet.
      </p>
      <div className="mt-5 rounded-card border border-line bg-soft p-4 text-left">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">
          Add to .env.local
        </p>
        <pre className="mt-2 overflow-x-auto text-[12px] leading-relaxed text-ink">
{`NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}
        </pre>
        <p className="mt-3 text-[12.5px] text-ink-2">
          Both are in the Supabase dashboard under{" "}
          <strong>Project Settings → API</strong>.
        </p>
      </div>
    </div>
  );
}
