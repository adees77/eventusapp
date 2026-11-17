"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ensureConversation } from "@/lib/data/actions";
import { useAction } from "@/lib/data/use-action";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * «Узнать цену» in place of a hidden price: opens the chat with the vendor with
 * the question already typed; the vendor's AI assistant answers there.
 */
export function AskPriceButton({
  vendorId,
  offerTitle,
  className,
  children,
}: {
  vendorId: string;
  offerTitle?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const { run, pending } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (actor.role !== "client") return toast(t("vendor.onlyClients"));
        const draft = offerTitle ? t("vendor.askPriceOffer", { title: offerTitle }) : t("vendor.askPriceDraft");
        void run(() => ensureConversation(vendorId), { onSuccess: (id) => router.push(routes.chat(id, { draft })) });
      }}
      className={cn("w-fit text-sm font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60", className)}
    >
      {children ?? t("vendor.askPrice")}
    </button>
  );
}
