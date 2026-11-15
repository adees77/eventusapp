"use client";

/** Landing: the category chips */
import { CategoryIcon } from "@/components/category-icon";
import { useCategories } from "@/lib/data/views/catalog";
import { useI18n } from "@/lib/i18n";

export function CategoryStrip() {
  const { l } = useI18n();
  const categories = useCategories();
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  return (
    <section className="no-scrollbar overflow-x-auto">
      <ul className="container-app flex min-w-max items-center justify-between gap-8 py-8 md:py-10">
        {sorted.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
            <CategoryIcon id={c.id} className="size-[18px]" />
            {l(c.name)}
          </li>
        ))}
      </ul>
    </section>
  );
}
