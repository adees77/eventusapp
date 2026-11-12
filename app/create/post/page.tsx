"use client";

import { useRouter } from "next/navigation";
import { CreateShell } from "@/components/vendor-panel/create-shell";
import { PostComposer } from "@/components/vendor-panel/post-composer";
import { useI18n } from "@/lib/i18n";

/** «+» → Публикация */
export default function CreatePostPage() {
  const { t } = useI18n();
  const router = useRouter();
  return <CreateShell title={t("vcab.newPost")}>{(vendor) => <PostComposer vendor={vendor} onDone={() => router.push("/me")} />}</CreateShell>;
}
