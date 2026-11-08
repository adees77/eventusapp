/**
 * Brand configuration — the single place to change name, logo and colours.
 * Colours are injected as CSS variables in app/layout.tsx, so every
 * component (and shadcn/ui) picks them up automatically.
 */
export const brand = {
  name: "EVENTUS",
  shortName: "Eventus",
  tagline: {
    ru: "Всё для вашего события — в одном разговоре",
    en: "Everything for your event — in one conversation",
  },
  logo: {
    /** Mark only (waves) */
    mark: "/brand/logo.svg",
    /** Mark for dark backgrounds */
    markInverse: "/brand/logo-inverse.svg",
    /** Original artwork supplied by the founder */
    original: "/brand/logo-original.png",
  },
  supportPhone: "+996 700 000 000",
  currency: { code: "KGS", symbol: "сом" },

  colors: {
    /** Logo blue — buttons, links, accents */
    primary: "#2A5FA5",
    primaryHover: "#234F8A",
    primaryForeground: "#FFFFFF",
    /** Page background — barely-blue white */
    background: "#F5F7FA",
    /** Cards, popovers */
    surface: "#FFFFFF",
    /** Soft blue surface — chips, selected states */
    secondary: "#EAF0F7",
    secondaryForeground: "#1F3B63",
    muted: "#ECEFF4",
    mutedForeground: "#6B7487",
    foreground: "#111827",
    /** Secondary text role */
    secondaryText: "#4B5565",
    border: "rgba(17, 24, 39, 0.09)",
    /** Soft gold — used sparingly: verified, rating, premium, hairlines */
    gold: "#C9A96E",
    goldSoft: "#F6F0E4",
    goldForeground: "#7A5F2E",
    success: "#16A34A",
    destructive: "#DC2626",
  },
} as const;

export type Brand = typeof brand;

export function brandCssVariables(): string {
  const c = brand.colors;
  return `:root{
--background:${c.background};
--foreground:${c.foreground};
--card:${c.surface};
--card-foreground:${c.foreground};
--popover:${c.surface};
--popover-foreground:${c.foreground};
--primary:${c.primary};
--primary-hover:${c.primaryHover};
--primary-foreground:${c.primaryForeground};
--secondary:${c.secondary};
--secondary-foreground:${c.secondaryForeground};
--muted:${c.muted};
--muted-foreground:${c.mutedForeground};
--text-secondary:${c.secondaryText};
--accent:${c.secondary};
--accent-foreground:${c.secondaryForeground};
--destructive:${c.destructive};
--success:${c.success};
--border:${c.border};
--input:${c.border};
--ring:${c.primary};
--gold:${c.gold};
--gold-soft:${c.goldSoft};
--gold-foreground:${c.goldForeground};
}`;
}
