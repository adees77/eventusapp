import { LogoMark } from "@/components/brand/logo";

/**
 * The EVENTUS wave mark, very faint, behind a chat. The parent needs
 * `relative isolate`: the mark sits under the messages, above the background.
 */
export function LogoWatermark() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
      <LogoMark title="" className="h-auto w-[min(72%,440px)] text-primary opacity-[0.06]" />
    </div>
  );
}
