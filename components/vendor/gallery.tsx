"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const shown = photos.slice(0, 9);
  const go = (d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {shown.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            className="relative aspect-square overflow-hidden rounded-xl bg-muted first:col-span-2 first:row-span-2"
          >
            <Image src={src} alt="" fill sizes="(min-width: 1024px) 25vw, 33vw" className="object-cover transition-opacity hover:opacity-90" />
          </button>
        ))}
      </div>

      <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent
          className="max-w-[min(92vw,1100px)] gap-0 overflow-hidden border-0 bg-foreground p-0 sm:max-w-[min(92vw,1100px)]"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {index !== null && (
            <div className="relative aspect-[3/2] w-full">
              <Image src={photos[index]} alt="" fill sizes="92vw" className="object-contain" />
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground"
                aria-label="Previous"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground"
                aria-label="Next"
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground/60 px-2.5 py-1 text-xs text-white tabular-nums">
                {index + 1} / {photos.length}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
