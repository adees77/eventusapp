"use client";

/**
 * A legal document page (/privacy, /terms): dark header with the title and edition date, a sticky table
 * of contents on desktop, and the sections. Placeholders in the text are filled from config/legal.ts and
 * the platform settings, so the numbers always match how the product works.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Footer } from "@/components/landing/footer";
import { usePlatformSettings } from "@/lib/data/views/catalog";
import type { LText } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import type { LegalDoc } from "@/lib/legal/types";
import { routes } from "@/lib/routes";
import { brand } from "@/config/brand";
import { legal } from "@/config/legal";

export function LegalPage({ doc, extra }: { doc: LegalDoc; extra?: Partial<Record<string, ReactNode>> }) {
  const { t, locale } = useI18n();
  const settings = usePlatformSettings();
  const vars: Record<string, string> = {
    operator: legal.operator[locale] || brand.name,
    address: legal.address[locale],
    email: legal.email,
    days: String(settings.autoReleaseDays),
    complaints: String(settings.autoHideComplaints),
    fee: String(settings.feePercent),
  };
  const fill = (s: LText) => s[locale].replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
  const date = new Date(doc.updated).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-dvh bg-background">
      <div className="p-2 md:p-3">
        <header className="surface-ink rounded-[28px] pb-10 md:rounded-[36px] md:pb-14">
          <div className="container-app flex h-16 items-center gap-3 md:h-20">
            <Link href={routes.home} aria-label={brand.name} className="shrink-0 whitespace-nowrap [&_*]:!text-white">
              <Logo />
            </Link>
            <nav className="ml-auto hidden items-center gap-1 text-sm sm:flex">
              {[
                [routes.privacy, t("landing.footPrivacy")],
                [routes.terms, t("landing.footTerms")],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="rounded-full px-3 py-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="container-app mt-8 md:mt-14">
            <h1 className="display max-w-3xl text-[32px] break-words hyphens-auto md:text-6xl">{fill(doc.title)}</h1>
            <p className="mt-3 text-sm text-white/55">
              {t("legal.updated", { date })}
              {legal.inn && ` · ${t("legal.inn")} ${legal.inn}`}
            </p>
            <p className="mt-5 max-w-2xl text-md leading-relaxed text-white/75">{fill(doc.intro)}</p>
          </div>
        </header>
      </div>

      <main className="container-app grid grid-cols-1 gap-10 py-10 md:py-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label={t("legal.contents")} className="hidden lg:block">
          <div className="sticky top-6">
            <div className="text-xs font-medium text-muted-foreground">{t("legal.contents")}</div>
            <ol className="mt-3 flex flex-col gap-1 text-sm">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-xl px-3 py-1.5 text-text-secondary transition-colors hover:bg-foreground/[0.045] hover:text-foreground">
                    {fill(s.title)}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="flex max-w-[720px] flex-col gap-10">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="display text-2xl break-words hyphens-auto md:text-[28px]">{fill(s.title)}</h2>
              <div className="mt-4 flex flex-col gap-4 text-[15px] leading-relaxed text-text-secondary">
                {s.blocks.map((b, i) =>
                  b.list ? (
                    <ul key={i} className="flex flex-col gap-2.5">
                      {b.list.map((item, j) => (
                        <li key={j} className="flex gap-3">
                          <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-sun" aria-hidden />
                          <span>{fill(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    b.p && <p key={i}>{fill(b.p)}</p>
                  ),
                )}
                {extra?.[s.id]}
              </div>
            </section>
          ))}
        </article>
      </main>

      <Footer />
    </div>
  );
}
