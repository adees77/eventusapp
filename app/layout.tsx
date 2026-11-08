import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { brand, brandCssVariables } from "@/config/brand";
import type { Locale } from "@/lib/data/types";
import { DEFAULT_LOCALE, I18nProvider, LOCALE_COOKIE, LOCALES } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.tagline.ru,
  icons: { icon: brand.logo.mark },
};

export const viewport: Viewport = {
  themeColor: brand.colors.background,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale = cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable} h-full antialiased`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCssVariables() }} />
      </head>
      <body className="min-h-full">
        <I18nProvider initialLocale={locale}>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-center" />
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
