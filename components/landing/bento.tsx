"use client";

/** Landing: feature tiles */
import { Check, Lock, Mic } from "lucide-react";
import { InvitationThumb } from "@/components/invitation/thumb";
import { useFirstInvitation } from "@/lib/data/views/landing";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Heading } from "./heading";

export function Bento() {
  const { t } = useI18n();
  const invitation = useFirstInvitation();
  const bars = [38, 62, 48, 80, 100, 70, 56, 88, 44];

  return (
    <section id="bento" className="container-app scroll-mt-6 py-14 md:py-20">
      <Heading title={t("landing.bentoTitle")} text={t("landing.bentoText")} />
      <div className="mt-10 grid gap-3 md:grid-cols-6 md:gap-4">
        <Tile className="md:col-span-2" title={t("landing.b1")} text={t("landing.b1Text")}>
          <div className="flex h-28 items-end gap-1.5">
            {bars.map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={cn("flex-1 rounded-full", i === 4 ? "bg-sun" : i % 3 === 0 ? "bg-primary/25" : "bg-primary")}
              />
            ))}
          </div>
        </Tile>

        <Tile className="md:col-span-2" title={t("landing.b2")} text={t("landing.b2Text")}>
          <ol className="flex flex-col gap-2.5">
            {[t("landing.stPaid"), t("landing.stHeld"), t("landing.stDone")].map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    i < 2 ? "bg-primary text-primary-foreground" : "bg-sun text-sun-foreground",
                  )}
                >
                  {i < 2 ? <Check className="size-3.5" strokeWidth={2.5} /> : <Lock className="size-3" />}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </Tile>

        <Tile className="md:col-span-2" title={t("landing.b3")} text={t("landing.b3Text")}>
          <div className="flex h-28 items-end justify-between gap-3">
            <div className="w-20 -rotate-3">{invitation && <InvitationThumb inv={invitation} />}</div>
            <div className="mb-1 rounded-2xl bg-card px-3 py-2 shadow-soft">
              <div className="display text-2xl tabular-nums">86</div>
              <div className="mt-1 flex h-1 w-20 overflow-hidden rounded-full bg-muted">
                <span className="w-[64%] bg-primary" />
                <span className="w-[10%] bg-sun" />
              </div>
              <div className="mt-1 text-2xs text-muted-foreground">{t("landing.invMock")}</div>
            </div>
          </div>
        </Tile>

        <Tile className="md:col-span-3" title={t("landing.b4")} text={t("landing.b4Text")}>
          <div className="flex h-24 items-center justify-center gap-[3px]">
            {Array.from({ length: 36 }, (_, i) => {
              const h = 14 + Math.abs(Math.sin(i * 0.7)) * 56;
              return i === 18 ? (
                <span key={i} className="mx-3 flex size-14 shrink-0 items-center justify-center rounded-full bg-sun text-sun-foreground shadow-[0_0_0_10px_rgb(242_201_76/0.25)]">
                  <Mic className="size-5" />
                </span>
              ) : (
                <span key={i} style={{ height: h }} className="w-[3px] shrink-0 rounded-full bg-primary/35" />
              );
            })}
          </div>
        </Tile>

        <Tile className="md:col-span-3" title={t("landing.b5")} text={t("landing.b5Text")}>
          <svg viewBox="0 0 400 90" className="h-24 w-full text-primary" fill="none" aria-hidden>
            <path
              d="M0 60 C 30 60, 40 20, 70 22 S 110 75, 140 70 S 180 25, 210 30 S 250 80, 280 66 S 320 18, 350 28 S 385 55, 400 50"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="210" cy="30" r="7" fill="var(--sun)" />
            <circle cx="70" cy="22" r="4" fill="currentColor" />
            <circle cx="350" cy="28" r="4" fill="currentColor" />
          </svg>
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  title,
  text,
  className,
  children,
}: {
  title: string;
  text: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-6 rounded-[28px] bg-cream p-5 md:p-6", className)}>
      <div>
        <h3 className="text-lg leading-snug font-medium tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-secondary">{text}</p>
      </div>
      {children}
    </div>
  );
}
