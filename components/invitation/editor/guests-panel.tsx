"use client";

import { Check, Copy, Plus, Send, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, Field, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addGuests, markGuestsSent, removeGuest } from "@/lib/data/actions";
import type { Invitation } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { guestStatus, rsvpOfGuest, type GuestStatus } from "@/lib/invitations/design";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export const STATUS_TONE: Record<GuestStatus, string> = {
  draft: "bg-border",
  sent: "bg-gold",
  opened: "bg-primary/60",
  coming: "bg-success",
  declined: "bg-destructive",
};

export function guestLink(inv: Pick<Invitation, "id">, guestId?: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/i/${inv.id}${guestId ? `?g=${guestId}` : ""}`;
}

export function shareText(inv: Invitation, t: ReturnType<typeof useI18n>["t"], name?: string) {
  const body = inv.names ? t("inv.shareNames", { names: inv.names }) : t("inv.shareGeneric");
  return name ? `${name}, ${body.charAt(0).toLowerCase()}${body.slice(1)}` : body;
}

export function GuestsPanel({ inv }: { inv: Invitation }) {
  const { t } = useI18n();
  const actor = useActor();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState("");
  const [seats, setSeats] = useState(1);
  const [bulk, setBulk] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState<GuestStatus | "all">("all");
  const groups = Array.from(new Set(inv.guests.map((g) => g.group).filter(Boolean))) as string[];
  const rows = inv.guests.filter((g) => filter === "all" || guestStatus(inv, g) === filter);

  function addOne(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addGuests(actor, inv.id, [{ name, phone, group: group || undefined, seats }]);
    setName("");
    setPhone("");
    setSeats(1);
  }

  function importBulk() {
    const list = (bulk ?? "")
      .split("\n")
      .map((line) => line.split(/[,;\t]/).map((x) => x.trim()))
      .filter(([n]) => n)
      .map(([n, p, s]) => ({ name: n, phone: p, seats: Number(s) || 1, group: group || undefined }));
    const n = addGuests(actor, inv.id, list);
    toast.success(t("inv.imported", { n }));
    setBulk(null);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("invitations.linkCopied"));
    } catch {
      toast(text);
    }
  }

  function send(g: (typeof inv.guests)[number], via: "wa" | "tg" | "copy") {
    const link = guestLink(inv, g.id);
    const text = shareText(inv, t, g.name.split(" ")[0]);
    if (via === "copy") void copy(`${text} ${link}`);
    else {
      const url =
        via === "wa"
          ? `https://wa.me/${(g.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`${text} ${link}`)}`
          : `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
    }
    markGuestsSent(actor, inv.id, [g.id]);
  }

  const statuses: (GuestStatus | "all")[] = ["all", "draft", "sent", "opened", "coming", "declined"];
  const count = (s: GuestStatus) => inv.guests.filter((g) => guestStatus(inv, g) === s).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8">
      <form
        onSubmit={addOne}
        className="grid gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-[1.4fr_1fr_1fr_88px_auto] md:items-end"
      >
        <Field label={t("inv.guestName")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            maxLength={80}
            placeholder="Айпери Токтогулова"
          />
        </Field>
        <Field label={t("cabinet.phone")}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} inputMode="tel" placeholder="+996 …" />
        </Field>
        <Field label={t("inv.group")}>
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className={inputClass}
            list="guest-groups"
            placeholder={t("inv.groupPlaceholder")}
          />
          <datalist id="guest-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </Field>
        <Field label={t("inv.seats")}>
          <input type="number" min={1} max={10} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className={inputClass} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" className="h-10 px-4" disabled={!name.trim()}>
            <Plus />
            {t("common.add")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3"
            onClick={() => setBulk("")}
            aria-label={t("inv.import")}
            title={t("inv.import")}
          >
            <Upload />
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm",
                filter === s ? "border-primary bg-secondary text-secondary-foreground" : "border-border text-text-secondary hover:bg-muted",
              )}
            >
              {s !== "all" && <span className={cn("size-1.5 rounded-full", STATUS_TONE[s])} />}
              {t(`inv.status.${s}`)}
              <span className="text-xs text-muted-foreground tabular-nums">{s === "all" ? inv.guests.length : count(s)}</span>
            </button>
          ))}
        </div>
        {picked.length > 0 && (
          <Button
            variant="outline"
            className="h-9 px-4"
            onClick={() => {
              markGuestsSent(actor, inv.id, picked);
              toast.success(t("inv.markedSent", { n: picked.length }));
              setPicked([]);
            }}
          >
            <Check />
            {t("inv.markSent")} · {picked.length}
          </Button>
        )}
      </div>

      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={t("common.all")}
                    checked={picked.length > 0 && picked.length === rows.length}
                    onChange={(e) => setPicked(e.target.checked ? rows.map((g) => g.id) : [])}
                    className="accent-primary"
                  />
                </th>
                <th className="px-2 py-3 font-normal">{t("inv.guestName")}</th>
                <th className="px-2 py-3 font-normal">{t("inv.group")}</th>
                <th className="px-2 py-3 text-right font-normal">{t("inv.seats")}</th>
                <th className="px-4 py-3 font-normal">{t("admin.status")}</th>
                <th className="px-4 py-3 text-right font-normal">{t("inv.send")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const st = guestStatus(inv, g);
                const r = rsvpOfGuest(inv, g.id);
                return (
                  <tr key={g.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={g.name}
                        checked={picked.includes(g.id)}
                        onChange={(e) => setPicked((p) => (e.target.checked ? [...p, g.id] : p.filter((x) => x !== g.id)))}
                        className="accent-primary"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div>{g.name}</div>
                      {g.phone && <div className="text-xs text-muted-foreground tabular-nums">{g.phone}</div>}
                    </td>
                    <td className="px-2 py-3 text-text-secondary">{g.group ?? "—"}</td>
                    <td className="px-2 py-3 text-right tabular-nums">{r?.attending ? r.guests : g.seats}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                        <span className={cn("size-1.5 rounded-full", STATUS_TONE[st])} />
                        {t(`inv.status.${st}`)}
                      </span>
                      {r?.note && <div className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground">«{r.note}»</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <SendBtn label="WhatsApp" onClick={() => send(g, "wa")}>
                          WA
                        </SendBtn>
                        <SendBtn label="Telegram" onClick={() => send(g, "tg")}>
                          TG
                        </SendBtn>
                        <SendBtn label={t("invitations.copyLink")} onClick={() => send(g, "copy")}>
                          <Copy className="size-3.5" />
                        </SendBtn>
                        <SendBtn label={t("inv.delete")} onClick={() => removeGuest(actor, inv.id, g.id)}>
                          <Trash2 className="size-3.5" />
                        </SendBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          <Send className="size-5 text-muted-foreground" strokeWidth={1.5} />
          {t("inv.noGuests")}
        </Empty>
      )}

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
            <Button disabled={!bulk?.trim()} onClick={importBulk}>
              {t("inv.importDo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SendBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-border px-2 text-2xs text-text-secondary transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
