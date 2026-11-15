"use client";

/** Landing section heading */

export function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-16">
      <h2 className="display text-[32px] md:text-[44px]">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-text-secondary md:justify-self-end">{text}</p>
    </div>
  );
}
