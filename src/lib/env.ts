/**
 * The app is deployed before its Supabase keys are necessarily in place, so
 * pages check this and render a setup notice instead of throwing a stack trace
 * at whoever opens the URL first.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
