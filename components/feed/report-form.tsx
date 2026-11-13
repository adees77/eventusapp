"use client";

import { useState } from "react";
import { toast } from "sonner";
import { textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { reportContent } from "@/lib/data/actions";
import type { ComplaintReason, ComplaintTarget } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const REASONS: ComplaintReason[] = ["fraud", "fake", "offensive", "spam", "quality", "other"];

/** Pick a reason, add details, send: the report lands in /admin/complaints */
export function ReportForm({ target, targetId, onDone }: { target: ComplaintTarget; targetId: string; onDone: () => void }) {
  const { t } = useI18n();
  const actor = useActor();
  const [reason, setReason] = useState<ComplaintReason | null>(null);
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) return;
        const ok = reportContent(actor, target, targetId, reason, text);
        toast(ok ? t("mod.reportSent") : t("mod.reportDup"));
        onDone();
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm text-text-secondary">{t("mod.reportWhat")}</legend>
        <div className="flex flex-col gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
              className={cn(
                "rounded-2xl px-4 py-2.5 text-left text-sm transition-colors",
                reason === r ? "bg-ink text-white" : "bg-foreground/[0.045] hover:bg-foreground/[0.08]",
              )}
            >
              {t(`mod.reason.${r}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("mod.reportText")}
        aria-label={t("mod.reportText")}
        rows={3}
        maxLength={500}
        className={textareaClass}
      />
      <Button type="submit" variant="destructive" disabled={!reason} className="h-11">
        {t("mod.reportSend")}
      </Button>
    </form>
  );
}
