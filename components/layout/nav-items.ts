import { BarChart3, CalendarHeart, CircleUserRound, LayoutGrid, Mail, MessageCircle, MessageSquareText, Plus, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/data/types";
import type { MessageKey } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: MessageKey;
  icon: LucideIcon;
  /** the vendor's «+» author button: opens the create menu instead of a page */
  create?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  client: [
    { href: "/assistant", label: "nav.chat", icon: MessageSquareText },
    { href: "/vendors", label: "nav.feed", icon: LayoutGrid },
    { href: "/invitations", label: "nav.invitations", icon: Mail },
    { href: "/messages", label: "nav.messages", icon: MessageCircle },
    { href: "/dashboard", label: "nav.cabinet", icon: CalendarHeart },
  ],
  // social layout: feed and chats on the left, «+» in the middle, business cabinet and own profile on the right
  vendor: [
    { href: "/vendors", label: "nav.feed", icon: LayoutGrid },
    { href: "/messages", label: "nav.messages", icon: MessageCircle },
    { href: "/create", label: "nav.create", icon: Plus, create: true },
    { href: "/vendor", label: "nav.cabinet", icon: BarChart3 },
    { href: "/me", label: "nav.profile", icon: CircleUserRound },
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
