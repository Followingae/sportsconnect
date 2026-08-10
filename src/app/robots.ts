import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The portals and anything account-shaped have nothing to index and
        // shouldn't be crawled.
        disallow: [
          "/admin",
          "/organizer",
          "/my-events",
          "/payments",
          "/profile",
          "/notifications",
          "/auth/",
          "/reset-password",
          "/verify-email",
          "/no-access",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
