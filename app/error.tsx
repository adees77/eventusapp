"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 p-2 md:p-3">
      <div className="surface-ink flex flex-1 flex-col items-center justify-center rounded-[28px] px-4 py-24 text-center md:rounded-[36px]">
      <h1 className="font-heading tracking-[-0.025em] text-4xl font-normal md:text-5xl">{t("common.error")}</h1>
      <p className="mt-2 text-sm text-white/60">{error.message}</p>
      <Button variant="sun" className="mt-8 h-11 px-5" onClick={reset}>
        {t("common.retry")}
      </Button>
      </div>
    </div>
  );
}
