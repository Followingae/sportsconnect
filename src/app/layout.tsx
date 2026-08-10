import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import { ToastProvider } from "@/components/ui/feedback";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Sportsconnect — Find and register for sports events in Dubai",
    template: "%s · Sportsconnect",
  },
  description:
    "Football, padel, cricket, badminton and basketball events across Dubai. Find a game, register your team, and play.",
  applicationName: "Sportsconnect",
  openGraph: { siteName: "Sportsconnect", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#14161A",
  width: "device-width",
  initialScale: 1,
  // Allow zoom — pinch-to-zoom is an accessibility requirement.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[10px] focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
