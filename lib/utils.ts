export { cn } from "cn"

/** No-op Storage for SSR, so persisted stores don't touch Node's localStorage */
export const serverStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
}

/**
 * Browser storage that never throws. Some browsers block localStorage /
 * sessionStorage (Safari "Block all cookies", in-app webviews, old private
 * mode): reading it throws or writes fail. Then we fall back to memory, so the
 * demo still runs — it just forgets data on reload.
 */
const memoryStores: Record<string, Storage> = {}

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  }
}

export function safeStorage(kind: "localStorage" | "sessionStorage"): Storage {
  if (typeof window === "undefined") return serverStorage
  try {
    const s = window[kind]
    const probe = "__eventus_probe__"
    s.setItem(probe, "1")
    s.removeItem(probe)
    return s
  } catch {
    return (memoryStores[kind] ??= memoryStorage())
  }
}
