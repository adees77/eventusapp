"use client";

/**
 * How the UI runs an action (lib/data/actions). Actions are async and throw; this hook turns
 * that into `pending` / `error` state and a toast, so screens don't each write try/catch.
 *
 *   const { run, pending } = useAction();
 *   <Button pending={pending} onClick={() => run(() => confirmDeal(id), { success: t("…") })} />
 *   const booking = await run(() => createBooking(input));   // undefined if it failed
 *
 * `run` never rejects: on failure it shows the error (unless `onError` returns true — handled)
 * and resolves to undefined. Actions that return nothing resolve to undefined on success too,
 * so put follow-ups (close a dialog, clear a field, navigate) in `onSuccess`. While one run is pending, further runs from the same hook are
 * ignored, which stops double submits. For writes nobody waits on (view counters, read
 * receipts, autosave) use `background(() => action())`.
 */
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { PolicyError } from "./policies";
import { AvailabilityError } from "./actions/bookings";

type T = ReturnType<typeof useT>;

export interface RunOptions<R> {
  /** Toast shown after success */
  success?: string | ((result: R) => string);
  /** Neutral toast after success (no check mark) — for "declined", "kept", "unblocked" */
  notice?: string;
  onSuccess?: (result: R) => void;
  /** Return true when the screen handled the error itself (no toast) */
  onError?: (error: unknown) => boolean | void;
  /** Names this run, so `isPending(key)` can show the spinner on the button that started it */
  key?: string;
}

/** User-facing text for an action error */
export function actionErrorMessage(error: unknown, t: T): string {
  if (error instanceof PolicyError) return t("common.forbidden");
  if (error instanceof AvailabilityError) return t("common.unavailable", { n: error.free });
  return t("common.actionFailed");
}

/** Simulated network latency for checking loading states locally (NEXT_PUBLIC_ACTION_DELAY_MS) */
const DELAY = Number(process.env.NEXT_PUBLIC_ACTION_DELAY_MS) || 0;
const latency = () => (DELAY ? new Promise((r) => setTimeout(r, DELAY)) : Promise.resolve());

export function useAction() {
  const t = useT();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    async <R>(fn: () => Promise<R>, opts: RunOptions<R> = {}): Promise<R | undefined> => {
      if (busy.current) return undefined;
      busy.current = true;
      setRunning(opts.key ?? "");
      setError(null);
      try {
        await latency();
        const result = await fn();
        if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(result) : opts.success);
        if (opts.notice) toast(opts.notice);
        opts.onSuccess?.(result);
        return result;
      } catch (e) {
        console.error(e);
        if (!opts.onError?.(e)) {
          const message = actionErrorMessage(e, t);
          setError(message);
          toast.error(message);
        }
        return undefined;
      } finally {
        busy.current = false;
        setRunning(null);
      }
    },
    [t],
  );

  return {
    run,
    /** Any run of this hook is in flight */
    pending: running !== null,
    /** The run started with this `key` is in flight */
    isPending: (key: string) => running === key,
    error,
    clearError: () => setError(null),
  };
}

/** Fire-and-forget write (view counters, read receipts, autosave): logs instead of throwing */
export function background(fn: () => Promise<unknown>): void {
  fn().catch((e) => console.warn("[background action]", e));
}
