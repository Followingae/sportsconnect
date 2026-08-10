import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_EVENT_STATUSES } from "@/lib/status";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/home`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/explore`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/venues`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  if (!isSupabaseConfigured()) return staticRoutes;

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("slug, updated_at")
    .in("status", PUBLIC_EVENT_STATUSES)
    .limit(2000);

  return [
    ...staticRoutes,
    ...(data ?? []).map((e) => ({
      url: `${SITE_URL}/e/${e.slug}`,
      lastModified: e.updated_at ? new Date(e.updated_at) : undefined,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
