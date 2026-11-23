import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { brandName, brandTagline } from "@/lib/site-config";
import { PwaRegister } from "@/components/PwaRegister";
import { NavigationTracker } from "@/components/NavigationTracker";
import { getLocale, getT } from "@/lib/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // mono is only used in code blocks — don't block render for it
});

export const viewport: Viewport = {
  themeColor: "#7c3aed",
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
  // Links shared on WhatsApp and social media show metashield.online.
  metadataBase: new URL("https://metashield.online"),
  // The link preview on WhatsApp, Instagram, Facebook and X.
  openGraph: {
    siteName: brandName,
    url: "https://metashield.online",
    type: "website",
    title: "MetaShield — Protect your Instagram & Facebook accounts",
    description: "Monthly account protection for Instagram and Facebook, with account recovery included.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "MetaShield" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MetaShield — Protect your Instagram & Facebook accounts",
    description: "Monthly account protection for Instagram and Facebook, with account recovery included.",
    images: ["/og-image.png"],
  },
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
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-ink-900">
        <NavigationTracker />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
