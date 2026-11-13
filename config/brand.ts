/**
 * Brand configuration — the single place to change name, logo and colours.
 * Colours are injected as CSS variables in app/layout.tsx, so every
 * component (and shadcn/ui) picks them up automatically.
 */
export const brand = {
  name: "EVENTUS",
  shortName: "Eventus",
  tagline: {
    ru: "ИИ-организатор праздников: расскажите о событии — ассистент всё организует",
    en: "AI event planner: tell it about your event and it organises everything",
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
    /** Page background — warm white */
    background: "#F7F5F0",
    /** Cards, popovers */
    surface: "#FFFFFF",
    /** Beige block surface — borderless cards sit on this or on white */
    cream: "#F1ECE1",
    /** Soft blue surface — chips, selected states */
    secondary: "#E6EEF8",
    secondaryForeground: "#1F3B63",
    muted: "#EEEBE4",
    mutedForeground: "#6E7381",
    foreground: "#101828",
    /** Secondary text role */
    secondaryText: "#4A5263",
    border: "rgba(16, 24, 40, 0.08)",
    /** Deep navy — hero, footer, dark cards */
    ink: "#0D1A2F",
    inkSoft: "#16294A",
    /** Sun yellow — main calls to action, highlights */
    sun: "#F2C94C",
    sunForeground: "#1B1606",
    /** Soft gold — rating, verified */
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
--cream:${c.cream};
--ink:${c.ink};
--ink-soft:${c.inkSoft};
--sun:${c.sun};
--sun-foreground:${c.sunForeground};
--gold:${c.gold};
--gold-soft:${c.goldSoft};
--gold-foreground:${c.goldForeground};
}`;
}
