import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import { ToastProvider } from "@/components/ui/feedback";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sportsconnect | Book courts and join games in Dubai",
    template: "%s · Sportsconnect",
  },
  description:
    "Find football, padel, cricket, badminton and basketball events across Dubai. Register solo or as a team, pay by bank transfer or cash at the venue, and play.",
  applicationName: "Sportsconnect",
  keywords: [
    "sports events Dubai",
    "padel Dubai",
    "football 7-a-side Dubai",
    "cricket tournament Dubai",
    "badminton Dubai",
    "basketball 3x3 Dubai",
    "book a court Dubai",
    "join a game Dubai",
  ],
  authors: [{ name: "Sportsconnect" }],
  creator: "Sportsconnect",
  publisher: "Sportsconnect",
  category: "sports",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: "Sportsconnect",
    locale: "en_AE",
    url: SITE_URL,
    title: "Sportsconnect | Game on, anytime",
    description:
      "Book courts and join games in seconds. Football, padel, cricket, badminton and basketball across Dubai.",
    images: [
      {
        url: "/covers/padel.webp",
        width: 1600,
        height: 900,
        alt: "Padel players mid-rally on a glass court in Dubai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sportsconnect | Game on, anytime",
    description:
      "Book courts and join games in seconds. Five sports, one platform, live in Dubai.",
    images: ["/covers/padel.webp"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    // The marketing site is navy; the app is white. Match whichever is on top.
    { media: "(prefers-color-scheme: light)", color: "#0B2A39" },
    { media: "(prefers-color-scheme: dark)", color: "#0B2A39" },
  ],
  width: "device-width",
  initialScale: 1,
  // Pinch-to-zoom stays available; capping it out is an accessibility failure.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AE" className={urbanist.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[10px] focus:bg-ink focus:px-4 focus:py-2 focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
