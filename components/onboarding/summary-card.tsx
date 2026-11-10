"use client";

import { LogoMark } from "@/components/brand/logo";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import type { Answers, StepId } from "@/lib/onboarding/script";
import { eventTitle } from "./labels";

/** The onboarding result set like a printed card (same paper + gold hairline as the home InvitationCard). */
export function SummaryCard({
  answers,
  onEdit,
  onConfirm,
  busy,
}: {
  answers: Answers;
  onEdit: (step: StepId) => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const { t, l, date, money, tn } = useI18n();
  const categories = useDB((db) => db.categories);
  const cat = (id?: string) => l(categories.find((c) => c.id === id)?.name);
  const none = <span className="text-muted-foreground">{t("onboarding.summary.none")}</span>;

  const rows: { step: StepId; label: string; value: React.ReactNode }[] =
    answers.role === "vendor"
      ? [
          { step: "bizName", label: t("onboarding.summary.bizName"), value: answers.bizName },
          { step: "category", label: t("onboarding.summary.category"), value: cat(answers.category) },
          { step: "city", label: t("onboarding.summary.city"), value: l(CITIES[answers.city ?? ""]) },
          { step: "phone", label: t("onboarding.summary.phone"), value: answers.phone || none },
          { step: "tagline", label: t("onboarding.summary.tagline"), value: answers.tagline },
          {
            step: "offerTitle",
            label: t("onboarding.summary.offer"),
            value: answers.offerTitle ? `${answers.offerTitle}${answers.offerPrice ? ` · ${money(answers.offerPrice)}` : ""}` : none,
          },
        ]
      : [
          { step: "date", label: t("onboarding.summary.date"), value: answers.date ? date(answers.date, "d MMMM yyyy, EEEE") : none },
          { step: "city", label: t("onboarding.summary.city"), value: l(CITIES[answers.city ?? ""]) },
          { step: "guests", label: t("onboarding.summary.guests"), value: tn("common.guests", answers.guests ?? 0) },
          {
            step: "budget",
            label: t("onboarding.summary.budget"),
            value: answers.budget ? money(answers.budget) : t("onboarding.summary.budgetUnknown"),
          },
          {
            step: "priorities",
            label: t("onboarding.summary.priorities"),
            value: answers.priorities?.length ? answers.priorities.map(cat).join(", ") : none,
          },
        ];

  const heading = answers.role === "vendor" ? answers.bizName : eventTitle(answers, t);

  return (
    <div className="w-full max-w-md animate-rise rounded-2xl border border-border bg-[var(--paper)] p-3 shadow-lift">
      <div className="rounded-md border border-gold/50 px-5 pt-7 pb-5 sm:px-7">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-2.5 w-auto text-gold" title="" />
          <p className="mt-4 font-serif text-2xl leading-tight [text-wrap:balance]">{heading}</p>
          <span className="mt-4 h-px w-10 bg-gold/60" aria-hidden />
        </div>
        <dl className="mt-5 divide-y divide-border/70">
          {rows.map((r) => (
            <div key={r.step} className="flex items-baseline gap-3 py-2.5">
              <dt className="w-28 shrink-0 text-xs text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 flex-1 text-sm break-words">{r.value}</dd>
              <button
                type="button"
                onClick={() => onEdit(r.step)}
                disabled={busy}
                className="shrink-0 text-xs text-primary transition-colors hover:text-primary-hover disabled:opacity-50"
              >
                {t("onboarding.edit")}
              </button>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="mt-5 h-11 w-full rounded-xl bg-primary text-md text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? t("onboarding.creating") : t("onboarding.confirm")}
        </button>
      </div>
    </div>
  );
}
