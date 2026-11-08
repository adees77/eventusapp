"use client";

/**
 * Voice input via the Web Speech API (Chrome, Edge, Safari).
 * Languages: ru-RU by default, ky-KG and en-US selectable. Browsers without
 * the API get state "unsupported" and the UI explains it.
 * For production-grade Kyrgyz recognition, swap this for a server STT
 * (send the recorded audio to a route handler) behind the same hook.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export const VOICE_LANGS = ["ru-RU", "ky-KG", "en-US"] as const;
export type VoiceLang = (typeof VOICE_LANGS)[number];
export type SpeechState = "idle" | "listening" | "denied" | "error";

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

export function useSpeech(onText: (text: string, final: boolean) => void) {
  const supported = useSyncExternalStore(noop, () => getCtor() !== null, () => true);
  const [state, setState] = useState<SpeechState>("idle");
  const [lang, setLang] = useState<VoiceLang>("ru-RU");
  const recRef = useRef<Recognition | null>(null);
  const cbRef = useRef(onText);
  useEffect(() => {
    cbRef.current = onText;
  }, [onText]);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      cbRef.current((finalText + interim).trim(), false);
    };
    rec.onerror = (e) => setState(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "no-speech" || e.error === "aborted" ? "idle" : "error");
    rec.onend = () => {
      if (finalText.trim()) cbRef.current(finalText.trim(), true);
      setState((s) => (s === "listening" ? "idle" : s));
      recRef.current = null;
    };
    recRef.current = rec;
    setState("listening");
    try {
      rec.start();
    } catch {
      setState("error");
    }
  }, [lang]);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, state, lang, setLang, start, stop, setState };
}
