"use client";

import { ArrowLeft, Copy, ExternalLink, Files, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { DesignEditor } from "@/components/invitation/editor/design-editor";
import { GuestsPanel, guestLink } from "@/components/invitation/editor/guests-panel";
import { SharePanel } from "@/components/invitation/editor/share-panel";
import { StatsPanel } from "@/components/invitation/editor/stats-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteInvitation, duplicateInvitation } from "@/lib/data/actions";
import { can } from "@/lib/data/policies";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { invitationStats } from "@/lib/invitations/design";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const TABS = ["design", "guests", "stats", "share"] as const;
type Tab = (typeof TABS)[number];

export default function InvitationEditorPage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const actor = useActor();
  const inv = useDB((db) => db.invitations.find((i) => i.id === id));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tab: Tab = TABS.find((x) => x === params.get("tab")) ?? "design";

  if (!inv || !can.manageInvitation(actor, inv.ownerId)) {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <p className="font-heading tracking-[-0.025em] text-2xl">{t("invitations.notFound")}</p>
        <Link href="/invitations" className="text-sm text-primary">
          {t("invitations.back")}
        </Link>
      </div>
    );
  }

  const s = invitationStats(inv);
  const setTab = (k: Tab) => router.replace(`/invitations/${inv.id}${k === "design" ? "" : `?tab=${k}`}`, { scroll: false });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(guestLink(inv!));
      toast.success(t("invitations.linkCopied"));
    } catch {
      toast(guestLink(inv!));
    }
  }

  return (
    <div className="flex h-[calc(100dvh-56px-64px)] flex-col lg:h-[calc(100dvh-64px)]">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-2 md:px-4">
        <Link
          href="/invitations"
          className="flex size-9 items-center justify-center rounded-lg text-text-secondary hover:bg-muted"
          aria-label={t("invitations.back")}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{inv.names || t(`invitations.occasions.${inv.occasion}`)}</div>
          <div className="truncate text-xs text-muted-foreground">
            {t(`invitations.occasions.${inv.occasion}`)} · {t("inv.headStats", { coming: s.persons, guests: s.guests })}
          </div>
        </div>
        <nav className="no-scrollbar mx-auto flex h-full gap-1 overflow-x-auto max-md:hidden" aria-label={t("nav.invitations")}>
          {TABS.map((k) => (
            <TabBtn key={k} on={tab === k} onClick={() => setTab(k)}>
              {t(`inv.tabs.${k}`)}
              {k === "guests" && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{s.guests}</span>}
            </TabBtn>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button variant="outline" className="h-9 px-3 max-sm:hidden" onClick={() => window.open(`/i/${inv.id}`, "_blank")}>
            <ExternalLink />
            {t("inv.preview")}
          </Button>
          <Button className="h-9 px-3" onClick={copyLink}>
            <Copy />
            <span className="max-sm:hidden">{t("invitations.copyLink")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-lg text-text-secondary hover:bg-muted"
                  aria-label={t("common.more")}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => {
                  const copy = duplicateInvitation(actor, inv.id);
                  if (copy) router.push(`/invitations/${copy.id}`);
                }}
              >
                <Files className="size-4" />
                {t("invitations.duplicate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive">
                <Trash2 className="size-4" />
                {t("invitations.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <nav className="no-scrollbar flex h-11 shrink-0 gap-1 overflow-x-auto px-2 md:hidden">
        {TABS.map((k) => (
          <TabBtn key={k} on={tab === k} onClick={() => setTab(k)}>
            {t(`inv.tabs.${k}`)}
          </TabBtn>
        ))}
      </nav>

      {tab === "design" ? (
        <DesignEditor inv={inv} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "guests" && <GuestsPanel inv={inv} />}
          {tab === "stats" && <StatsPanel inv={inv} />}
          {tab === "share" && <SharePanel inv={inv} />}
        </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("invitations.delete")}</DialogTitle>
            <DialogDescription>{t("invitations.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteInvitation(actor, inv.id);
                router.replace("/invitations");
              }}
            >
              {t("invitations.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "relative flex h-full shrink-0 items-center px-3 text-sm transition-colors",
        on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {on && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />}
    </button>
  );
}
