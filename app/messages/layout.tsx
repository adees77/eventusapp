"use client";

import { ConversationList } from "@/components/messages/conversation-list";
import { useI18n } from "@/lib/i18n";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex h-[calc(100dvh-56px-80px)] w-full max-w-7xl lg:h-[calc(100dvh-64px)] lg:px-6 lg:py-6 xl:px-8">
      <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-l-2xl border border-border bg-card lg:flex">
        <h1 className="border-b border-border px-4 py-4 text-base font-medium">{t("messages.title")}</h1>
        <div className="flex-1 overflow-y-auto">
          <ConversationList />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card lg:rounded-r-2xl lg:border lg:border-l-0 lg:border-border">
        {children}
      </div>
    </div>
  );
}
