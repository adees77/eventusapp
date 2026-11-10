"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Kpi } from "@/components/layout/cabinet-shell";
import { Empty, Field, PageHeader, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { requestPayout } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { vendorBalance } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function VendorFinance() {
  const { t, money, date } = useI18n();
  const actor = useActor();
  const vendor = useMyVendor();
  const db = useDB((d) => d);
  const bal = vendorBalance(vendor.id, db.bookings, db.transactions);
  const tx = db.transactions.filter((x) => x.vendorId === vendor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const sign = (k: string) => (k === "release" ? "+" : k === "payout" || k === "fee" ? "−" : "");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("vcab.finance")}
        subtitle={t("vcab.financeHint")}
        action={
          <Button
            className="h-10 px-4"
            disabled={bal.available <= 0}
            onClick={() => {
              setAmount(String(bal.available));
              setOpen(true);
            }}
          >
            {t("vcab.withdraw")}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={t("vcab.available")} value={money(bal.available)} note={t("vcab.availableNote")} />
        <Kpi label={t("cabinet.frozen")} value={money(bal.held)} note={t("vcab.frozenNote")} tone="primary" />
        <Kpi label={t("vcab.earned")} value={money(bal.earned)} note={t("vcab.earnedNote")} />
        <Kpi label={t("vcab.fees")} value={money(bal.fees)} note={t("escrow.fee", { p: db.settings.feePercent })} />
      </div>
      <Section title={t("cabinet.history")}>
        {tx.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 pb-2 font-normal">{t("vcab.colDate")}</th>
                  <th className="px-5 pb-2 font-normal">{t("vcab.colOp")}</th>
                  <th className="px-5 pb-2 font-normal">{t("vcab.colClient")}</th>
                  <th className="px-5 pb-2 text-right font-normal">{t("vcab.colAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((x) => (
                  <tr key={x.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-text-secondary tabular-nums">{date(x.createdAt.slice(0, 10), "d MMM yyyy")}</td>
                    <td className="px-5 py-3">{t(`cabinet.tx.${x.kind}`)}</td>
                    <td className="px-5 py-3 text-text-secondary">{db.users.find((u) => u.id === x.clientId)?.name ?? "—"}</td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right tabular-nums",
                        x.kind === "release" && "text-success",
                        x.kind === "hold" && "text-muted-foreground",
                      )}
                    >
                      {sign(x.kind)}
                      {money(x.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t("cabinet.noPayments")}</Empty>
        )}
      </Section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("vcab.withdraw")}</DialogTitle>
            <DialogDescription>{t("vcab.withdrawHint", { amount: money(bal.available) })}</DialogDescription>
          </DialogHeader>
          <Field label={t("vcab.colAmount")}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={bal.available}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!(Number(amount) > 0)}
              onClick={() => {
                try {
                  const sum = requestPayout(actor, vendor.id, Number(amount));
                  toast.success(t("vcab.withdrawn", { amount: money(sum) }));
                  setOpen(false);
                } catch {
                  toast.error(t("common.error"));
                }
              }}
            >
              {t("vcab.withdraw")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
