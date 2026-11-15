"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, PageHeader, Section, Segmented } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { resolveComplaint } from "@/lib/data/actions";
import { useComplaints, type ComplaintTargetInfo } from "@/lib/data/views/moderation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function AdminComplaints() {
  const { t, l, date } = useI18n();
  const [f, setF] = useState<"open" | "closed">("open");
  const { rows: list, openCount, closedCount } = useComplaints(f);
  const label = (tg: ComplaintTargetInfo) =>
    tg.vendorName ?? (tg.caption ? l(tg.caption) : tg.review ? `${tg.review.author}: «${l(tg.review.text)}»` : "—");
  const where = { vendor: t("mod.onVendor"), post: t("mod.onPost"), review: t("mod.onReview") };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("mod.complaints")} subtitle={t("mod.complaintsHint")} />
      <Segmented
        value={f}
        onChange={setF}
        options={[
          { value: "open", label: `${t("mod.open")} · ${openCount}` },
          { value: "closed", label: `${t("mod.closed")} · ${closedCount}` },
        ]}
      />
      {list.length ? (
        <ul className="flex flex-col gap-3">
          {list.map(({ complaint: c, target: tg, vendorName, reports }) => {
            return (
              <li key={c.id}>
                <Section
                  title={
                    <span className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <Flag className="size-4" strokeWidth={1.75} />
                      </span>
                      {t(`mod.reason.${c.reason}`)}
                    </span>
                  }
                  action={<span className="text-xs text-muted-foreground tabular-nums">{date(c.createdAt.slice(0, 10), "d MMM")}</span>}
                >
                  <div className="flex gap-3 rounded-2xl bg-foreground/[0.035] p-3">
                    {tg.photo && (
                      // eslint-disable-next-line @next/next/no-img-element -- tiny moderation preview
                      <img src={tg.photo} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        {where[c.target]}
                        {c.target !== "vendor" && vendorName ? ` · ${vendorName}` : ""}
                        {tg.hidden && c.status === "open" ? ` · ${t("mod.autoHidden")}` : ""}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm">{label(tg)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 text-sm">
                    {reports.map(({ complaint: x, authorName }) => (
                      <p key={x.id} className="text-text-secondary">
                        <span className="text-foreground">{t("mod.from", { who: authorName || "—" })}</span>
                        {x.reason !== c.reason ? ` · ${t(`mod.reason.${x.reason}`)}` : ""}
                        {x.text ? ` — ${x.text}` : ""}
                      </p>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {tg.href && (
                      <Link
                        href={tg.href}
                        className="inline-flex h-9 items-center rounded-full bg-foreground/[0.05] px-4 text-sm hover:bg-foreground/[0.09]"
                      >
                        {t("mod.openIt")}
                      </Link>
                    )}
                    {c.status === "open" ? (
                      <>
                        <Button
                          variant="destructive"
                          className="h-9 px-4"
                          onClick={() => {
                            resolveComplaint(c.id, true);
                            toast.success(t("mod.hiddenToast"));
                          }}
                        >
                          {t("mod.hideIt")}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 px-4"
                          onClick={() => {
                            resolveComplaint(c.id, false);
                            toast(t("mod.keptToast"));
                          }}
                        >
                          {t("mod.keepIt")}
                        </Button>
                        {reports.length > 1 && (
                          <span className="text-xs text-muted-foreground">{t("mod.reportsOnTarget", { n: reports.length })}</span>
                        )}
                      </>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex h-7 items-center rounded-full px-3 text-xs",
                          c.resolution === "hidden" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
                        )}
                      >
                        {c.resolution === "hidden" ? t("mod.resHidden") : t("mod.resKept")}
                      </span>
                    )}
                  </div>
                </Section>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>{t("mod.noComplaints")}</Empty>
      )}
    </div>
  );
}
