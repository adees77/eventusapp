"use client";

import { MessageCircle } from "lucide-react";
import { ConversationList } from "@/components/messages/conversation-list";
import { useI18n } from "@/lib/i18n";

export default function MessagesPage() {
  const { t } = useI18n();
  return (
    <>
      <div className="flex-1 overflow-y-auto lg:hidden">
        <h1 className="px-4 pt-6 pb-2 font-serif text-3xl font-medium">{t("messages.title")}</h1>
        <ConversationList />
      </div>
      <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground lg:flex">
        <MessageCircle className="size-6" strokeWidth={1.5} />
        {t("messages.selectChat")}
      </div>
    </>
  );
}
