"use client";

import Link from "next/link";
import { useState } from "react";
import { EscrowBadge } from "@/components/booking/deal-card";
import { Empty, PageHeader, Section, Segmented } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { resolveDispute } from "@/lib/data/actions";
import { useDisputes } from "@/lib/data/views/admin";
import type { EscrowState } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { useAction } from "@/lib/data/use-action";

export default function AdminDisputes() {
  const { run } = useAction();
  const { t, l, money, date } = useI18n();
  const [f, setF] = useState<EscrowState | "all">("disputed");
  const { rows: deals, counts } = useDisputes(f);
  const count = (s: EscrowState) => counts[s];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("acab.disputes")} subtitle={t("acab.disputesHint")} />
      <Segmented
        value={f}
        onChange={setF}
        options={[
          { value: "disputed", label: `${t("escrow.states.disputed")} · ${count("disputed")}` },
          { value: "held", label: `${t("escrow.states.held")} · ${count("held")}` },
          { value: "released", label: `${t("escrow.states.released")} · ${count("released")}` },
          { value: "refunded", label: `${t("escrow.states.refunded")} · ${count("refunded")}` },
          { value: "all", label: t("common.all") },
        ]}
      />
      {deals.length ? (
        <ul className="flex flex-col gap-3">
          {deals.map(({ booking: b, vendorName, clientName, offerTitle, conversationId, disputeByName }) => {
            const e = b.escrow!;
            return (
              <li key={b.id}>
                <Section
                  title={`${vendorName} ← ${clientName || "—"}`}
                  action={<span className="text-md font-medium tabular-nums">{money(e.amount)}</span>}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                    <span>{l(offerTitle)}</span>
                    <span className="tabular-nums">{date(b.date, "d MMM yyyy")}</span>
                    <EscrowBadge booking={b} />
                    <span className="text-xs">
                      {t("escrow.client")}: {e.clientConfirmedAt ? "✓" : "—"} · {t("escrow.vendor")}: {e.vendorConfirmedAt ? "✓" : "—"}
                    </span>
                  </div>
                  {e.dispute && (
                    <blockquote className="mt-3 border-l-2 border-destructive/40 pl-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        {t("acab.openedBy", { who: disputeByName || "—", date: date(e.dispute.openedAt.slice(0, 10), "d MMM") })}
                      </div>
                      <p className="mt-0.5">{e.dispute.reason}</p>
                      {e.dispute.resolution && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("acab.resolved")}: {e.dispute.resolution === "release" ? t("acab.toVendor") : t("acab.toClient")}
                        </p>
                      )}
                    </blockquote>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {conversationId && (
                      <Link
                        href={routes.chat(conversationId)}
                        className="inline-flex h-9 items-center rounded-full bg-foreground/[0.05] px-4 text-sm hover:bg-foreground/[0.09]"
                      >
                        {t("acab.readChat")}
                      </Link>
                    )}
                    {e.state === "disputed" && (
                      <>
                        <Button
                          className="h-9 px-4"
                          onClick={() => run(() => resolveDispute(b.id, "release"), { success: t("acab.releasedToast") })}
                        >
                          {t("acab.toVendor")}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 px-4"
                          onClick={() => run(() => resolveDispute(b.id, "refund"), { success: t("acab.refundedToast") })}
                        >
                          {t("acab.toClient")}
                        </Button>
                      </>
                    )}
                  </div>
                </Section>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>{t("acab.noDeals")}</Empty>
      )}
    </div>
  );
}
