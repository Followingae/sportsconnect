import type { MetadataRoute } from "next";

/** The brief asks for the app to be PWA-ready; this is the minimum that earns it. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sportsconnect",
    short_name: "Sportsconnect",
    description:
      "Find and register for football, padel, cricket, badminton and basketball events across Dubai.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#14161A",
    categories: ["sports", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
