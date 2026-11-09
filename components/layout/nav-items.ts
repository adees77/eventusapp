import { CalendarHeart, LayoutGrid, MessageCircle, MessageSquareText, Search, Shield, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/data/types";
import type { MessageKey } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: MessageKey;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  client: [
    { href: "/", label: "nav.assistant", icon: MessageSquareText },
    { href: "/vendors", label: "nav.catalog", icon: Search },
    { href: "/messages", label: "nav.messages", icon: MessageCircle },
    { href: "/dashboard", label: "nav.dashboard", icon: CalendarHeart },
  ],
  vendor: [
    { href: "/vendor", label: "nav.vendorPanel", icon: Store },
    { href: "/messages", label: "nav.messages", icon: MessageCircle },
    { href: "/vendors", label: "nav.catalog", icon: LayoutGrid },
  ],
  admin: [
    { href: "/admin", label: "nav.admin", icon: Shield },
    { href: "/vendors", label: "nav.catalog", icon: LayoutGrid },
  ],
};

export const HOME_BY_ROLE: Record<Role, string> = {
  client: "/",
  vendor: "/vendor",
  admin: "/admin",
};

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
