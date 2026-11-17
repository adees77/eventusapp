"use client";

import { DatePicker } from "@/components/date-picker";
import { InvitationPage } from "@/components/invitation/page/invitation-page";
import { Field, inputClass, textareaClass } from "@/components/panel";
import { updateInvitation } from "@/lib/data/actions";
import type { BlockType, Invitation, InvitationBlock, InvitationDesign } from "@/lib/data/types";
import { background } from "@/lib/data/use-action";
import { useI18n } from "@/lib/i18n";
import { THEMES, newBlock } from "@/lib/invitations/design";
import { cn } from "@/lib/utils";
import { useDesignHistory } from "./use-design-history";

/**
 * Editor for an invitation made from a template: just the fields a host
 * fills in (names, words, date, place…) next to a live preview. The block
 * structure of the template stays as it is.
 */
export function QuickEditor({ inv }: { inv: Invitation }) {
  const { t } = useI18n();
  const h = useDesignHistory(inv);
  const design = inv.design;
  const first = (type: BlockType) => design.blocks.find((b) => b.type === type);
  const cover = first("cover");
  const message = first("text");
  const dress = first("dresscode");

  // top-level fields (date, place…): autosave while typing
  const set = (patch: Partial<Invitation>) => background(() => updateInvitation(inv.id, patch));

  /** Writes a prop of the first block of a type; creates the block (before RSVP) when the template has none */
  function setProp(type: BlockType, prop: string, value: string) {
    h.apply((d: InvitationDesign) => {
      const i = d.blocks.findIndex((b) => b.type === type);
      if (i >= 0) {
        const blocks = d.blocks.map((b, k) => (k === i ? { ...b, props: { ...b.props, [prop]: value } } : b));
        return { ...d, blocks };
      }
      const b: InvitationBlock = newBlock(type, { occasion: inv.occasion });
      b.props = { ...b.props, [prop]: value };
      if (type === "text") b.style = { align: "center", size: "l", font: "serif", italic: true };
      const at = type === "text" ? 1 : Math.max(d.blocks.findIndex((x) => x.type === "rsvp"), 0) || d.blocks.length;
      return { ...d, blocks: [...d.blocks.slice(0, at), b, ...d.blocks.slice(at)] };
    }, `${type}:${prop}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-h-0 overflow-y-auto bg-background lg:w-[440px] lg:shrink-0">
        <div className="flex flex-col gap-4 px-4 py-6 md:px-8">
          <div>
            <h2 className="display text-2xl">{t("inv.quickTitle")}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t("inv.quickHint")}</p>
          </div>

          <Card>
            <Field label={t("invitations.fields.names")}>
              <input
                value={(cover?.props.title as string | undefined) ?? inv.names}
                onChange={(e) => {
                  setProp("cover", "title", e.target.value);
                  set({ names: e.target.value });
                }}
                className={inputClass}
                maxLength={80}
                placeholder="Айгерим и Тимур"
              />
            </Field>
            <Field label={t("invitations.fields.heading")}>
              <input
                value={(cover?.props.kicker as string | undefined) ?? inv.heading}
                onChange={(e) => {
                  setProp("cover", "kicker", e.target.value);
                  set({ heading: e.target.value });
                }}
                className={inputClass}
                maxLength={80}
              />
            </Field>
            <Field label={t("invitations.fields.message")}>
              <textarea
                value={(message?.props.text as string | undefined) ?? inv.message}
                onChange={(e) => setProp("text", "text", e.target.value)}
                className={textareaClass}
                rows={4}
                maxLength={600}
              />
            </Field>
          </Card>

          <Card>
            <div className="grid grid-cols-[1fr_104px] gap-2">
              <Field label={t("invitations.fields.date")}>
                <DatePicker value={inv.date || null} onChange={(d) => set({ date: d ?? "" })} clearable={false} />
              </Field>
              <Field label={t("invitations.fields.time")}>
                <input type="time" value={inv.time} onChange={(e) => set({ time: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <Field label={t("invitations.fields.venue")}>
              <input value={inv.venue} onChange={(e) => set({ venue: e.target.value })} className={inputClass} maxLength={80} placeholder="Ресторан «Асман»" />
            </Field>
            <Field label={t("invitations.fields.address")}>
              <input value={inv.address} onChange={(e) => set({ address: e.target.value })} className={inputClass} maxLength={120} />
            </Field>
          </Card>

          <Card>
            <Field label={t("invitations.fields.dressCode")}>
              <input
                value={(dress?.props.text as string | undefined) ?? ""}
                onChange={(e) => setProp("dresscode", "text", e.target.value)}
                className={inputClass}
                maxLength={80}
              />
            </Field>
            <Field label={t("invitations.fields.contact")}>
              <input value={inv.contact ?? ""} onChange={(e) => set({ contact: e.target.value })} className={inputClass} maxLength={40} inputMode="tel" placeholder="+996 …" />
            </Field>
            <div>
              <div className="mb-2 text-sm text-text-secondary">{t("inv.color")}</div>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => h.apply((d) => ({ ...d, theme: { ...x } }))}
                    aria-pressed={design.theme.id === x.id}
                    aria-label={t(`inv.themes.${x.id}` as never)}
                    title={t(`inv.themes.${x.id}` as never)}
                    className={cn(
                      "relative size-10 overflow-hidden rounded-full transition-transform hover:scale-105",
                      design.theme.id === x.id && "ring-2 ring-ink ring-offset-2 ring-offset-card",
                    )}
                    style={{ background: x.bg }}
                  >
                    <span className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: x.accent }} />
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* live preview */}
      <div className="min-h-0 flex-1 overflow-auto bg-cream max-lg:hidden">
        <div className="flex min-h-full justify-center px-6 py-8">
          <div className="pointer-events-none h-fit w-[390px] max-w-full shrink-0 overflow-hidden rounded-[32px] bg-white shadow-[0_12px_40px_rgb(17_24_39/0.12)] ring-8 ring-ink">
            <InvitationPage data={inv} mode="thumb" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 md:p-5">{children}</div>;
}
