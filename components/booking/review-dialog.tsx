"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { leaveReview } from "@/lib/data/actions";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export function ReviewDialog({ bookingId, vendorName, onClose }: { bookingId: string | null; vendorName: string; onClose: () => void }) {
  const { t } = useI18n();
  const actor = useActor();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  return (
    <Dialog open={!!bookingId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cabinet.reviewTitle")}</DialogTitle>
          <DialogDescription>{vendorName}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1" role="radiogroup" aria-label={t("cabinet.reviewRating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              className="p-1"
              aria-label={String(n)}
            >
              <Star className={cn("size-7", n <= rating ? "fill-gold text-gold" : "text-border")} strokeWidth={1.25} />
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={t("cabinet.reviewPlaceholder")}
          className={textareaClass}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              try {
                leaveReview(actor, bookingId!, rating, text);
                toast.success(t("cabinet.reviewThanks"));
                setText("");
                onClose();
              } catch {
                toast.error(t("common.error"));
              }
            }}
          >
            {t("cabinet.reviewSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
