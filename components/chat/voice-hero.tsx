"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { VOICE_LANGS, useSpeech } from "@/lib/voice/use-speech";

/**
 * The voice-first start: one large round mic in the middle. Tap, tell everything
 * in your own words, and the finished phrase is sent as a message.
 * Typing stays available in the chat bar below.
 */
export function VoiceHero({
  title,
  subtitle,
  examples,
  onSend,
  disabled,
  className,
}: {
  title: string;
  subtitle?: string;
  examples?: string[];
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [live, setLive] = useState("");
  const speech = useSpeech((text, final) => {
    setLive(text);
    if (final && text.trim()) {
      onSend(text.trim());
      setLive("");
    }
  });
  const listening = speech.state === "listening";

  useEffect(() => {
    if (speech.state === "denied") toast.error(t("voice.denied"));
    if (speech.state === "error") toast.error(t("voice.failed"));
    if (speech.state === "denied" || speech.state === "error") speech.setState("idle");
  }, [speech, t]);

  function toggle() {
    if (!speech.supported) return toast(t("voice.unsupported"));
    if (listening) return speech.stop();
    setLive("");
    speech.start();
  }

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <h1 className="max-w-md font-serif text-[30px] leading-[1.08] tracking-[-0.01em] [text-wrap:balance] md:text-5xl">{title}</h1>
      {subtitle && (
        <p className="mt-2.5 max-w-sm text-[14px] leading-relaxed text-text-secondary md:mt-3 md:max-w-md md:text-md">{subtitle}</p>
      )}

      <div className="relative mt-6 flex size-32 items-center justify-center md:mt-12 md:size-40">
        {listening && (
          <>
            <span className="absolute inset-0 animate-[mic-ring_1.8s_ease-out_infinite] rounded-full bg-primary/15" aria-hidden />
            <span className="absolute inset-0 animate-[mic-ring_1.8s_ease-out_0.6s_infinite] rounded-full bg-primary/10" aria-hidden />
          </>
        )}
        <span className={cn("absolute inset-4 rounded-full transition-colors", listening ? "bg-primary/10" : "bg-secondary")} aria-hidden />
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? t("voice.stop") : t("voice.start")}
          className={cn(
            "relative flex size-20 items-center justify-center rounded-full md:size-24 text-primary-foreground shadow-[0_10px_30px_rgb(42_95_165/0.35)] transition-[transform,background-color] active:scale-[0.96] disabled:opacity-50",
            listening ? "bg-primary-hover" : "bg-primary hover:bg-primary-hover",
            !speech.supported && "opacity-60",
          )}
        >
          {listening ? <Square className="size-6 fill-current" /> : <Mic className="size-8 md:size-9" strokeWidth={1.6} />}
        </button>
      </div>

      <div className="mt-3 min-h-6 max-w-sm px-4 text-[14px] leading-relaxed md:mt-5 md:min-h-12 md:text-[15px]" aria-live="polite">
        {listening ? (
          <span className={live ? "text-foreground" : "text-muted-foreground"}>{live || t("voice.listening")}</span>
        ) : (
          <span className="text-muted-foreground">{t("voice.tapToTalk")}</span>
        )}
      </div>
      {!listening && (
        <button
          type="button"
          onClick={() => speech.setLang(VOICE_LANGS[(VOICE_LANGS.indexOf(speech.lang) + 1) % VOICE_LANGS.length])}
          className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("voice.language")}: {t(`voice.langs.${speech.lang}`)}
        </button>
      )}

      {examples && examples.length > 0 && !listening && (
        <div className="mt-6 w-full md:mt-8">
          <p className="mb-2.5 text-xs text-muted-foreground">{t("voice.orTry")}</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:justify-center md:px-0">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={disabled}
                onClick={() => onSend(ex)}
                className="w-[min(72vw,260px)] shrink-0 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-sm leading-snug text-text-secondary md:w-auto md:max-w-[280px] transition-colors hover:bg-muted hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
