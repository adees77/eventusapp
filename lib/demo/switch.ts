"use client";

import { switchDataMode } from "@/lib/data/store";
import { useModeStore, type DataMode } from "./mode";

/** Enter a data mode: remember it and swap the database under the app (before binding a user) */
export function enterMode(mode: DataMode) {
  useModeStore.getState().setMode(mode);
  switchDataMode(useModeStore.getState().mode);
}
