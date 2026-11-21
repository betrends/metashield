import type { Metadata, Viewport } from "next";
import "./globals.css";
import { brandName, brandTagline } from "@/lib/site-config";
import { PwaRegister } from "@/components/PwaRegister";
import { NavigationTracker } from "@/components/NavigationTracker";
import { getLocale, getT } from "@/lib/i18n/server";

export const viewport: Viewport = {
  themeColor: "#5038bf",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
  title: {
    default: `${brandName} — ${t(brandTagline)}`,
    template: `%s | ${brandName}`,
  },
  description: t(
    "Professional support for disabled, restricted, suspended and compromised social media and advertising accounts — with proactive account health assessments to identify risks before they become major problems.",
  ),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brandName,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  };
}

// Root layout stays minimal — the (marketing) route group adds the public
// site's Header/Footer, while /portal renders its own dashboard shell.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        {/* Self-hosted fonts (see globals.css): preload the two Latin files
            used above the fold so headings don't swap late. */}
        <link rel="preload" href="/fonts/newsreader-latin-opsz-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-ink-900">
        <NavigationTracker />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
