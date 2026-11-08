"use client";

import { ArrowUp, Mic, Square } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { VOICE_LANGS, useSpeech } from "@/lib/voice/use-speech";

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onStop: () => void;
  busy: boolean;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLTextAreaElement>(null);
  const baseRef = useRef("");

  const speech = useSpeech((text, final) => {
    const base = baseRef.current ? `${baseRef.current} ` : "";
    onChange(base + text);
    if (final) baseRef.current = base + text;
  });

  // auto-grow
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (speech.state === "denied") toast.error(t("voice.denied"));
    if (speech.state === "error") toast.error(t("voice.failed"));
    if (speech.state === "denied" || speech.state === "error") speech.setState("idle");
  }, [speech, t]);

  function submit() {
    if (!value.trim() || busy) return;
    if (speech.state === "listening") speech.stop();
    onSubmit(value);
    baseRef.current = "";
  }

  function toggleMic() {
    if (!speech.supported) return toast(t("voice.unsupported"));
    if (speech.state === "listening") return speech.stop();
    baseRef.current = value.trim();
    speech.start();
  }

  const listening = speech.state === "listening";
  const langShort = speech.lang.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-2 shadow-lift transition-colors",
        listening ? "border-primary/50" : "border-border focus-within:border-primary/40",
      )}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        maxLength={4000}
        autoFocus={autoFocus}
        placeholder={listening ? t("voice.listening") : placeholder}
        aria-label={placeholder}
        className="block max-h-[200px] min-h-12 w-full resize-none bg-transparent px-3 pt-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {listening && (
            <span className="flex items-center gap-2 pl-2 text-primary" aria-live="polite">
              <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                <span className="w-[3px] animate-[voice_900ms_ease-in-out_infinite] rounded-full bg-primary" />
                <span className="w-[3px] animate-[voice_900ms_ease-in-out_150ms_infinite] rounded-full bg-primary" />
                <span className="w-[3px] animate-[voice_900ms_ease-in-out_300ms_infinite] rounded-full bg-primary" />
              </span>
              {t("voice.listening")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => {
                    const i = VOICE_LANGS.indexOf(speech.lang);
                    speech.setLang(VOICE_LANGS[(i + 1) % VOICE_LANGS.length]);
                  }}
                  disabled={listening}
                  className="h-9 rounded-full px-2.5 text-xs font-medium text-muted-foreground tabular-nums transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={t("voice.language")}
                />
              }
            >
              {langShort}
            </TooltipTrigger>
            <TooltipContent>
              {t("voice.language")}: {t(`voice.langs.${speech.lang}`)}
            </TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={listening}
            aria-label={listening ? t("voice.stop") : t("voice.start")}
            className={cn(
              "flex size-10 items-center justify-center rounded-full transition-colors active:scale-[0.97]",
              listening
                ? "bg-primary text-primary-foreground"
                : "border border-border text-text-secondary hover:bg-muted hover:text-foreground",
              !speech.supported && "opacity-50",
            )}
          >
            {listening ? <Square className="size-3.5 fill-current" /> : <Mic className="size-[18px]" strokeWidth={1.75} />}
          </button>
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label={t("chat.stop")}
              className="flex size-10 items-center justify-center rounded-full bg-foreground text-background transition-colors active:scale-[0.97]"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim()}
              aria-label={t("chat.send")}
              className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[background-color,opacity] hover:bg-primary-hover active:scale-[0.97] disabled:opacity-30"
            >
              <ArrowUp className="size-[18px]" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
