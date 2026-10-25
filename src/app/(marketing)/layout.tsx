import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { InstallBanner } from "@/components/InstallBanner";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

// Only the public site is translated; the portal and admin stay in English.
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <LocaleProvider locale={locale}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <InstallBanner />
    </LocaleProvider>
  );
}
