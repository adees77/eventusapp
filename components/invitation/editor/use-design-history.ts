"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateInvitation } from "@/lib/data/actions";
import type { Actor } from "@/lib/data/policies";
import type { Invitation, InvitationDesign } from "@/lib/data/types";

const LIMIT = 80;
/** typing into the same field within this window is one undo step */
const COALESCE_MS = 900;

/**
 * Undo/redo over the invitation design. Every change is saved to the store at
 * once (autosave); history lives in memory for the editing session.
 * Stacks are refs (mutated only in event handlers); their sizes are mirrored in state.
 */
export function useDesignHistory(actor: Actor, inv: Invitation) {
  const past = useRef<InvitationDesign[]>([]);
  const future = useRef<InvitationDesign[]>([]);
  const last = useRef<{ key: string; at: number } | null>(null);
  const current = useRef(inv.design);
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });

  // changes coming from elsewhere (another tab) become the new baseline
  useEffect(() => {
    current.current = inv.design;
  }, [inv.design]);

  const save = useCallback(
    (d: InvitationDesign) => {
      current.current = d;
      updateInvitation(actor, inv.id, { design: d });
      setCounts({ undo: past.current.length, redo: future.current.length });
    },
    [actor, inv.id],
  );

  const apply = useCallback(
    (next: InvitationDesign | ((d: InvitationDesign) => InvitationDesign), coalesceKey?: string) => {
      const prev = current.current;
      const value = typeof next === "function" ? next(prev) : next;
      const now = Date.now();
      const merge = !!coalesceKey && last.current?.key === coalesceKey && now - last.current.at < COALESCE_MS;
      if (!merge) past.current = [...past.current, prev].slice(-LIMIT);
      last.current = coalesceKey ? { key: coalesceKey, at: now } : null;
      future.current = [];
      save(value);
    },
    [save],
  );

  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [current.current, ...future.current].slice(0, LIMIT);
    last.current = null;
    save(prev);
  }, [save]);

  const redo = useCallback(() => {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, current.current].slice(-LIMIT);
    last.current = null;
    save(next);
  }, [save]);

  return { apply, undo, redo, canUndo: counts.undo > 0, canRedo: counts.redo > 0 };
}
