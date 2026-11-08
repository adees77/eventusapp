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
