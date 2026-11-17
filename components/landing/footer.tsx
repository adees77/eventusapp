"use client";

/** Landing: footer */
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { brand } from "@/config/brand";

export function Footer() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  return (
    <footer className="p-2 md:p-3">
      <div className="surface-ink overflow-hidden rounded-[28px] md:rounded-[36px]">
        <div className="container-app pt-12 md:pt-16">
          <div
            className="display bg-gradient-to-b from-white/35 to-white/0 bg-clip-text text-center text-[15vw] leading-[0.8] font-medium tracking-[-0.06em] text-transparent select-none xl:text-[180px]"
            aria-hidden
          >
            {brand.name}
          </div>
        </div>
        <div className="container-app grid grid-cols-1 gap-10 py-12 md:grid-cols-[1.2fr_1fr_1.3fr]">
          <div className="flex flex-col gap-4">
            <Logo className="text-white [&_*]:!text-white" />
            <p className="max-w-xs text-sm text-white/55">{t("landing.finalText")}</p>
          </div>
          <div>
            <div className="text-sm font-medium">{t("landing.footNav")}</div>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-white/60">
              {[
                ["#story", t("landing.navHow")],
                [routes.welcomeVendor, t("landing.navVendors")],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium">{t("landing.footSub")}</div>
            <p className="mt-2 text-sm text-white/55">{t("landing.footSubText")}</p>
            <form
              className="mt-4 flex items-center gap-1 rounded-full bg-white/10 p-1 pl-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                setEmail("");
                toast.success(t("landing.footSubDone"));
              }}
            >
              <Mail className="size-4 shrink-0 text-white/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("landing.footEmail")}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
              <button type="submit" className="h-9 shrink-0 rounded-full bg-sun px-4 text-sm font-medium text-sun-foreground hover:brightness-95">
                {t("landing.footSubBtn")}
              </button>
            </form>
          </div>
        </div>
        <div className="container-app flex flex-col gap-3 pb-8 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <span>{t("landing.footer")}</span>
          <span className="flex gap-5">
            <span>{t("landing.footPrivacy")}</span>
            <span>{t("landing.footTerms")}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
