"use client";

import { ArrowLeft, LayoutTemplate, PenLine } from "lucide-react";
import { useState } from "react";
import { InvitationThumb } from "@/components/invitation/thumb";
import { Segmented } from "@/components/panel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INVITATION_TEMPLATES, OCCASIONS, draftFromTemplate, type InvitationTemplate } from "@/lib/data/invitation-templates";
import type { InvitationOccasion } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * «+» on the invitations page: first the way to start (blank builder or a
 * template), then — for templates — the gallery. Picking calls `onCreate`.
 */
export function CreateInvitationDialog({
  open,
  onOpenChange,
  onCreate,
  event,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (tpl?: InvitationTemplate) => void;
  event?: { id: string; date: string };
  busy?: boolean;
}) {
  const { t, l, locale } = useI18n();
  const [step, setStep] = useState<"choose" | "templates">("choose");
  const [occasion, setOccasion] = useState<InvitationOccasion | "all">("all");
  const templates = INVITATION_TEMPLATES.filter((tpl) => occasion === "all" || tpl.occasion === occasion);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setStep("choose");
      }}
    >
      <DialogContent className={cn("max-h-[90dvh] overflow-y-auto rounded-[28px] p-5 md:p-7", step === "templates" ? "sm:max-w-4xl" : "sm:max-w-xl")}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === "templates" && (
              <button
                type="button"
                onClick={() => setStep("choose")}
                aria-label={t("common.back")}
                className="-ml-1 flex size-8 items-center justify-center rounded-full text-text-secondary hover:bg-muted"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <DialogTitle className="display text-2xl">{step === "choose" ? t("inv.createTitle") : t("inv.pickTemplate")}</DialogTitle>
          </div>
          {step === "choose" && <DialogDescription>{t("inv.createHint")}</DialogDescription>}
        </DialogHeader>

        {step === "choose" ? (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Choice
              icon={<PenLine className="size-5" strokeWidth={1.75} />}
              title={t("inv.fromScratch")}
              text={t("inv.fromScratchHint")}
              onClick={() => onCreate()}
              disabled={busy}
            />
            <Choice
              icon={<LayoutTemplate className="size-5" strokeWidth={1.75} />}
              title={t("inv.fromTemplate")}
              text={t("inv.fromTemplateHint")}
              onClick={() => setStep("templates")}
              accent
            />
          </div>
        ) : (
          <div className="animate-rise">
            <Segmented
              value={occasion}
              onChange={setOccasion}
              options={[
                { value: "all", label: t("invitations.allOccasions") },
                ...OCCASIONS.map((o) => ({ value: o, label: t(`invitations.occasions.${o}`) })),
              ]}
            />
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
              {templates.map((tpl) => {
                const d = draftFromTemplate(tpl, locale, event);
                return (
                  <li key={tpl.id}>
                    <button type="button" disabled={busy} onClick={() => onCreate(tpl)} className="group block w-full text-left disabled:opacity-60">
                      <InvitationThumb
                        inv={{ id: tpl.id, design: d.design, date: d.date, time: d.time, venue: "", address: "", names: d.names, contact: undefined }}
                        className="transition-transform duration-200 group-hover:-translate-y-1"
                      />
                      <p className="mt-2.5 truncate text-sm">{l(tpl.name)}</p>
                      <p className="text-xs text-text-secondary">{t(`invitations.occasions.${tpl.occasion}`)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Choice({
  icon,
  title,
  text,
  onClick,
  accent,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex flex-col items-start gap-4 rounded-3xl p-5 text-left transition-[transform,background-color] duration-200 hover:-translate-y-0.5 disabled:opacity-60",
        accent ? "surface-ink text-white" : "bg-cream hover:bg-[color-mix(in_oklch,var(--cream),black_3%)]",
      )}
    >
      <span className={cn("flex size-11 items-center justify-center rounded-full", accent ? "bg-sun text-sun-foreground" : "bg-card text-primary")}>
        {icon}
      </span>
      <span>
        <span className="block font-heading text-lg tracking-[-0.02em]">{title}</span>
        <span className={cn("mt-1 block text-sm leading-relaxed", accent ? "text-white/70" : "text-text-secondary")}>{text}</span>
      </span>
    </button>
  );
}
