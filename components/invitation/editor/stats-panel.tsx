"use client";

import { Copy, Download, Eye, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BUCKET_COLOR, DonutLegend, Reveal, RsvpDonut, bucketSlices } from "@/components/invitation/rsvp-donut";
import { inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addGuests, markGuestsSent, removeGuest } from "@/lib/data/actions";
import type { Invitation } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { guestRows, guestsCsv, invitationStats, type GuestRow, type GuestStatus } from "@/lib/invitations/design";
import { cn } from "@/lib/utils";
import { guestLink, shareText } from "./share-links";
import { useAction } from "@/lib/data/use-action";

/**
 * «Статистика»: one ring of answers (tap a slice to filter), then the guest
 * list itself — add a guest, send the personal link, see who answered what.
 */
export function StatsPanel({ inv }: { inv: Invitation }) {
  const { t, tn, num } = useI18n();
  const { run, pending } = useAction();
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState(1);
  const [bulk, setBulk] = useState<string | null>(null);

  const s = invitationStats(inv);
  const rows = guestRows(inv);
  const slices = bucketSlices(rows, t);
  const shown = picked ? rows.filter((r) => r.bucket === picked) : rows;
  const labels: Record<GuestStatus, string> = {
    draft: t("inv.status.draft"),
    sent: t("inv.status.sent"),
    opened: t("inv.status.opened"),
    coming: t("inv.status.coming"),
    declined: t("inv.status.declined"),
  };

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    void run(() => addGuests(inv.id, [{ name, phone, seats }]), {
      onSuccess: () => {
        setName("");
        setPhone("");
        setSeats(1);
      },
    });
  }

  function importBulk() {
    const list = (bulk ?? "")
      .split("\n")
      .map((line) => line.split(/[,;\t]/).map((x) => x.trim()))
      .filter(([n]) => n)
      .map(([n, p, k]) => ({ name: n, phone: p, seats: Number(k) || 1 }));
    void run(() => addGuests(inv.id, list), { success: (n) => t("inv.imported", { n }), onSuccess: () => setBulk(null) });
  }

  function exportCsv() {
    const blob = new Blob([guestsCsv(inv, labels)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `guests-${inv.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function send(r: GuestRow, via: "wa" | "tg" | "copy") {
    if (!r.guestId) return;
    const link = guestLink(inv, r.guestId);
    const text = shareText(inv, t, r.name.split(" ")[0]);
    if (via === "copy") {
      navigator.clipboard?.writeText(`${text} ${link}`).then(
        () => toast.success(t("invitations.linkCopied")),
        () => toast(`${text} ${link}`),
      );
    } else {
      const url =
        via === "wa"
          ? `https://wa.me/${(r.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`${text} ${link}`)}`
          : `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
    }
    void run(() => markGuestsSent(inv.id, [r.guestId!]));
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 md:px-8">
      <section className="rounded-[28px] bg-card p-5 md:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10">
          <RsvpDonut
            slices={slices}
            selected={picked}
            onSelect={setPicked}
            center={{ value: num(rows.length), label: tn("inv.guestsN", rows.length) }}
            empty={<span className="text-xs leading-snug text-muted-foreground">{t("inv.emptyRing")}</span>}
          />
          <div className="min-w-0">
            <h2 className="display text-2xl">{t("inv.answersTitle")}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
              <span>{t("inv.personsComing", { n: num(s.persons) })}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Eye className="size-3.5" strokeWidth={1.75} />
                {t("inv.kViews", { n: num(s.views) })}
              </span>
            </p>
            <DonutLegend slices={slices} selected={picked} onSelect={setPicked} className="mt-4" />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg tracking-[-0.02em]">
            {picked ? slices.find((x) => x.key === picked)?.label : t("inv.guestsTitle")}
            <span className="ml-2 text-sm text-muted-foreground tabular-nums">{shown.length}</span>
          </h2>
          <div className="flex gap-1.5">
            <IconBtn label={t("inv.import")} onClick={() => setBulk("")}>
              <Upload className="size-4" />
            </IconBtn>
            <IconBtn label="CSV" onClick={exportCsv}>
              <Download className="size-4" />
            </IconBtn>
          </div>
        </div>

        <form onSubmit={add} className="grid grid-cols-[minmax(0,1fr)_72px_auto] gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_72px_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            maxLength={80}
            placeholder={t("inv.guestName")}
            aria-label={t("inv.guestName")}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={cn(inputClass, "max-sm:hidden")}
            inputMode="tel"
            placeholder="+996 …"
            aria-label={t("cabinet.phone")}
          />
          <input
            type="number"
            min={1}
            max={10}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className={inputClass}
            aria-label={t("inv.seats")}
            title={t("inv.seats")}
          />
          <Button type="submit" className="h-10 px-4" disabled={!name.trim()} pending={pending}>
            <Plus />
            <span className="max-sm:hidden">{t("common.add")}</span>
          </Button>
        </form>

        {rows.length ? (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {shown.map((r) => (
              <li key={r.key} className="flex animate-rise items-center gap-3 py-3">
                <span className="size-2 shrink-0 rounded-full" style={{ background: BUCKET_COLOR[r.bucket] }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{r.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[labels[r.status], r.viaCommon ? t("inv.viaCommon") : r.phone, r.note && `«${r.note}»`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="w-6 shrink-0 text-right text-sm tabular-nums" title={t("inv.persons")}>
                  {r.bucket === "declined" ? "—" : num(r.persons)}
                </span>
                <div className="flex shrink-0 gap-1">
                  {r.guestId && !r.direct && r.bucket !== "coming" && r.bucket !== "declined" && (
                    <>
                      <SendBtn label="WhatsApp" onClick={() => send(r, "wa")}>
                        WA
                      </SendBtn>
                      <SendBtn label="Telegram" onClick={() => send(r, "tg")}>
                        TG
                      </SendBtn>
                      <SendBtn label={t("invitations.copyLink")} onClick={() => send(r, "copy")}>
                        <Copy className="size-3.5" />
                      </SendBtn>
                    </>
                  )}
                  {r.guestId && (
                    <SendBtn label={t("inv.delete")} onClick={() => run(() => removeGuest(inv.id, r.guestId!))}>
                      <Trash2 className="size-3.5" />
                    </SendBtn>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("inv.noGuests")}</p>
        )}
        <Reveal open={!!picked && shown.length === 0}>
          <p className="py-6 text-center text-sm text-muted-foreground">{t("inv.nobodyHere")}</p>
        </Reveal>
      </section>

      <Dialog open={bulk !== null} onOpenChange={(o) => !o && setBulk(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("inv.import")}</DialogTitle>
            <DialogDescription>{t("inv.importHint")}</DialogDescription>
          </DialogHeader>
          <textarea
            value={bulk ?? ""}
            onChange={(e) => setBulk(e.target.value)}
            rows={8}
            className={cn(textareaClass, "font-mono text-xs")}
            placeholder={"Айгуль Асанова, +996 700 111 222, 2\nБакыт Осмонов, +996 555 333 444"}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulk(null)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!bulk?.trim()} pending={pending} onClick={importBulk}>
              {t("inv.importDo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.045] text-text-secondary transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
    >
      {children}
    </button>
  );
}

function SendBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 min-w-8 items-center justify-center rounded-full bg-foreground/[0.045] px-2 text-2xs text-text-secondary transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
    >
      {children}
    </button>
  );
}
