"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, PageHeader, Section, Segmented } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { resolveComplaint } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import type { Complaint, DB } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

/** What the report points at, with a link and whether it is hidden right now */
function targetOf(db: DB, c: Complaint, l: (x: { ru: string; en: string } | undefined) => string) {
  if (c.target === "vendor") {
    const v = db.vendors.find((x) => x.id === c.targetId);
    return { label: v?.name ?? "—", href: v ? `/vendors/${v.slug}` : undefined, hidden: !!v?.hidden, photo: v?.cover };
  }
  if (c.target === "post") {
    const p = db.posts.find((x) => x.id === c.targetId);
    return { label: p ? l(p.caption) : "—", href: p ? `/vendors?post=${p.id}` : undefined, hidden: !!p?.hidden, photo: p?.photos[0] };
  }
  const r = db.reviews.find((x) => x.id === c.targetId);
  const v = db.vendors.find((x) => x.id === r?.vendorId);
  return {
    label: r ? `${r.author}: «${l(r.text)}»` : "—",
    href: v ? `/vendors/${v.slug}?tab=reviews` : undefined,
    hidden: !!r?.hidden,
    photo: undefined,
  };
}

export default function AdminComplaints() {
  const { t, l, date } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [f, setF] = useState<"open" | "closed">("open");
  const open = db.complaints.filter((c) => c.status === "open");
  // one card per reported thing: several people may report the same post
  const list = (f === "open" ? open : db.complaints.filter((c) => c.status !== "open"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((c, i, a) => f === "closed" || a.findIndex((x) => x.targetId === c.targetId) === i);
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? "—";
  const where = { vendor: t("mod.onVendor"), post: t("mod.onPost"), review: t("mod.onReview") };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("mod.complaints")} subtitle={t("mod.complaintsHint")} />
      <Segmented
        value={f}
        onChange={setF}
        options={[
          { value: "open", label: `${t("mod.open")} · ${open.length}` },
          { value: "closed", label: `${t("mod.closed")} · ${db.complaints.length - open.length}` },
        ]}
      />
      {list.length ? (
        <ul className="flex flex-col gap-3">
          {list.map((c) => {
            const tg = targetOf(db, c, l);
            const same = open.filter((x) => x.targetId === c.targetId);
            const vendor = db.vendors.find((v) => v.id === c.vendorId);
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
                        {c.target !== "vendor" && vendor ? ` · ${vendor.name}` : ""}
                        {tg.hidden && c.status === "open" ? ` · ${t("mod.autoHidden")}` : ""}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm">{tg.label}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 text-sm">
                    {(f === "open" ? same : [c]).map((x) => (
                      <p key={x.id} className="text-text-secondary">
                        <span className="text-foreground">{t("mod.from", { who: name(x.authorId) })}</span>
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
                            resolveComplaint(actor, c.id, true);
                            toast.success(t("mod.hiddenToast"));
                          }}
                        >
                          {t("mod.hideIt")}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 px-4"
                          onClick={() => {
                            resolveComplaint(actor, c.id, false);
                            toast(t("mod.keptToast"));
                          }}
                        >
                          {t("mod.keepIt")}
                        </Button>
                        {same.length > 1 && (
                          <span className="text-xs text-muted-foreground">{t("mod.reportsOnTarget", { n: same.length })}</span>
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
