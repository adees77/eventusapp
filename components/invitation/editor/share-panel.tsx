"use client";

import { Copy, ExternalLink, Printer } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/panel";
import { Button } from "@/components/ui/button";
import type { Invitation } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { InvitationThumb } from "../thumb";
import { guestLink, shareText } from "./guests-panel";

export function SharePanel({ inv }: { inv: Invitation }) {
  const { t } = useI18n();
  const link = guestLink(inv);
  const text = shareText(inv, t);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("invitations.linkCopied"));
    } catch {
      toast(link);
    }
  }
  const channels = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(inv.names || t("nav.invitations"))}&body=${encodeURIComponent(`${text} ${link}`)}`,
    },
  ];
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:grid-cols-[280px_1fr] md:px-8">
      <InvitationThumb inv={inv} className="mx-auto w-full max-w-[280px]" />
      <div className="flex flex-col gap-6">
        <Section title={t("inv.shareLink")}>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-muted px-3 text-sm text-text-secondary"
              onFocus={(e) => e.target.select()}
            />
            <Button className="h-10 px-4" onClick={copy}>
              <Copy />
              {t("invitations.copyLink")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("inv.shareLinkHint")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm hover:bg-muted"
              >
                {c.label}
              </a>
            ))}
          </div>
        </Section>
        <Section title={t("inv.preview")}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10 px-4" onClick={() => window.open(`/i/${inv.id}`, "_blank")}>
              <ExternalLink />
              {t("inv.openPage")}
            </Button>
            <Button variant="outline" className="h-10 px-4" onClick={() => window.open(`/i/${inv.id}?print=1`, "_blank")}>
              <Printer />
              {t("inv.printPdf")}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("inv.personalHint")}</p>
        </Section>
      </div>
    </div>
  );
}
