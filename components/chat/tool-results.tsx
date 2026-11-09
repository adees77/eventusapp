"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AvailDots } from "@/components/avail-dots";
import { LinkButton } from "@/components/ui/link-button";
import { Rating, VerifiedSeal } from "@/components/vendor/badges";
import type { AlternativeDate, AvailabilityResult, SearchResult, VendorDetails, VendorHit } from "@/lib/ai/tool-defs";
import { useI18n } from "@/lib/i18n";
import { usePlanner } from "@/lib/planner";
import { useActor } from "@/lib/session";

/** Renders a tool_result as UI. Data comes only from our tools. */
export function ToolResultView({
  name,
  data,
  onQuickReply,
}: {
  name: string;
  data: unknown;
  onQuickReply: (text: string) => void;
}) {
  if (!data || typeof data !== "object" || "error" in data) return null;
  if (name === "search_vendors") {
    const r = data as SearchResult;
    return (
      <>
        {r.vendors.length > 0 && <VendorCards hits={r.vendors} date={r.date} qty={r.qty} />}
        {r.alternatives && r.alternatives.length > 0 && <AltDates alts={r.alternatives} onPick={onQuickReply} />}
      </>
    );
  }
  if (name === "suggest_alternatives") {
    const r = data as { alternatives: AlternativeDate[] };
    return r.alternatives?.length ? <AltDates alts={r.alternatives} onPick={onQuickReply} /> : null;
  }
  if (name === "get_vendor") {
    const v = data as VendorDetails;
    return <VendorCards hits={[v]} date={null} qty={null} />;
  }
  if (name === "check_availability") {
    const a = data as AvailabilityResult;
    return <AvailabilityList a={a} />;
  }
  return null;
}

function VendorCards({ hits, date, qty }: { hits: VendorHit[]; date: string | null; qty: number | null }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
      {hits.map((h, i) => (
        <ChatVendorCard key={h.vendor_id} h={h} date={date} qty={qty} index={i} />
      ))}
    </div>
  );
}

function ChatVendorCard({ h, date, qty, index }: { h: VendorHit; date: string | null; qty: number | null; index: number }) {
  const { t, money } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const setPlanner = usePlanner((s) => s.set);
  const offer = h.offer;

  function book() {
    if (actor.role !== "client") return toast(t("vendor.onlyClients"));
    if (date) setPlanner({ date });
    if (offer) {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (qty) params.set("qty", String(Math.min(qty, offer.free)));
      router.push(`/book/${offer.offer_id}?${params}`);
    } else {
      router.push(`/vendors/${h.slug}#offers`);
    }
  }

  return (
    <article
      className="flex w-[78%] shrink-0 snap-start animate-rise flex-col overflow-hidden rounded-2xl border border-border bg-card sm:w-auto"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link href={`/vendors/${h.slug}`} className="relative block aspect-[16/10] bg-muted">
        {h.cover && <Image src={h.cover} alt="" fill sizes="(min-width: 640px) 320px, 78vw" className="object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-1.5">
          <Link href={`/vendors/${h.slug}`} className="truncate text-md font-medium hover:underline">
            {h.name}
          </Link>
          {h.verified && <VerifiedSeal />}
          <Rating value={h.rating} className="ml-auto shrink-0 text-xs" />
        </div>
        {offer ? (
          <>
            <p className="line-clamp-1 text-sm text-text-secondary">{offer.title}</p>
            <div className="text-sm tabular-nums">
              <span className="font-medium">{money(offer.price)}</span>
              <span className="text-muted-foreground"> / {offer.unit}</span>
            </div>
            <AvailDots a={{ free: offer.free, total: offer.total, blocked: 0, booked: 0 }} size="sm" />
          </>
        ) : (
          <>
            <p className="line-clamp-1 text-sm text-text-secondary">{h.tagline}</p>
            <div className="text-sm tabular-nums">
              <span className="text-muted-foreground">{t("common.from")} </span>
              <span className="font-medium">{money(h.price_from)}</span>
              <span className="text-muted-foreground"> / {h.unit}</span>
            </div>
          </>
        )}
        <div className="mt-auto flex gap-2 pt-3">
          <button
            type="button"
            onClick={book}
            className="h-10 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:scale-[0.98]"
          >
            {t("chat.book")}
          </button>
          <LinkButton href={`/vendors/${h.slug}`} variant="outline" className="h-10 px-3">
            {t("chat.profile")}
          </LinkButton>
        </div>
      </div>
    </article>
  );
}

function AltDates({ alts, onPick }: { alts: AlternativeDate[]; onPick: (text: string) => void }) {
  const { date, locale } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {alts.map((a) => (
        <button
          key={a.date}
          type="button"
          onClick={() => onPick(locale === "ru" ? `Давайте ${date(a.date, "d MMMM")}` : `Let's do ${date(a.date, "MMMM d")}`)}
          className="h-8 rounded-lg border border-border bg-card px-3 text-sm text-text-secondary transition-colors hover:bg-muted hover:text-foreground"
        >
          {date(a.date, "d MMMM, EEEEEE")}
          <span className="ml-2 text-muted-foreground tabular-nums">{a.vendors}</span>
        </button>
      ))}
    </div>
  );
}

function AvailabilityList({ a }: { a: AvailabilityResult }) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
      {a.offers.map((o) => (
        <li key={o.offer_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="truncate">{o.title}</span>
          <AvailDots a={{ free: o.free, total: o.total, blocked: 0, booked: 0 }} size="sm" />
        </li>
      ))}
    </ul>
  );
}
