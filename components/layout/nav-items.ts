import { CalendarHeart, LayoutGrid, Mail, MessageCircle, MessageSquareText, Shield, Store } from "lucide-react";
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
    { href: "/vendors", label: "nav.feed", icon: LayoutGrid },
    { href: "/assistant", label: "nav.assistant", icon: MessageSquareText },
    { href: "/messages", label: "nav.messages", icon: MessageCircle },
    { href: "/invitations", label: "nav.invitations", icon: Mail },
    { href: "/dashboard", label: "nav.cabinet", icon: CalendarHeart },
  ],
  vendor: [
    { href: "/vendor", label: "nav.cabinet", icon: Store },
    { href: "/messages", label: "nav.messages", icon: MessageCircle },
    { href: "/vendors", label: "nav.feed", icon: LayoutGrid },
  ],
  admin: [
    { href: "/admin", label: "nav.admin", icon: Shield },
    { href: "/messages", label: "nav.messages", icon: MessageCircle },
    { href: "/vendors", label: "nav.feed", icon: LayoutGrid },
  ],
};

export const HOME_BY_ROLE: Record<Role, string> = {
  client: "/assistant",
  vendor: "/vendor",
  admin: "/admin",
};

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
