import { BarChart3, CalendarHeart, CircleUserRound, LayoutGrid, Mail, MessageCircle, MessageSquareText, Plus, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/data/types";
import type { MessageKey } from "@/lib/i18n";
import { routes } from "@/lib/routes";

export interface NavItem {
  href: string;
  label: MessageKey;
  icon: LucideIcon;
  /** the vendor's «+» author button: opens the create menu instead of a page */
  create?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  client: [
    { href: routes.assistant, label: "nav.chat", icon: MessageSquareText },
    { href: routes.feed, label: "nav.feed", icon: LayoutGrid },
    { href: routes.invitations, label: "nav.invitations", icon: Mail },
    { href: routes.inbox, label: "nav.messages", icon: MessageCircle },
    { href: routes.dashboard, label: "nav.cabinet", icon: CalendarHeart },
  ],
  // cabinet first, then feed, «+» in the middle, chats, own profile last
  vendor: [
    { href: routes.vendorHome, label: "nav.cabinet", icon: BarChart3 },
    { href: routes.feed, label: "nav.feed", icon: LayoutGrid },
    { href: routes.create, label: "nav.create", icon: Plus, create: true },
    { href: routes.inbox, label: "nav.messages", icon: MessageCircle },
    { href: routes.me, label: "nav.profile", icon: CircleUserRound },
  ],
  admin: [
    { href: routes.admin, label: "nav.admin", icon: Shield },
    { href: routes.inbox, label: "nav.messages", icon: MessageCircle },
    { href: routes.feed, label: "nav.feed", icon: LayoutGrid },
  ],
};

export const HOME_BY_ROLE: Record<Role, string> = {
  client: routes.assistant,
  vendor: routes.vendorHome,
  admin: routes.admin,
};

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
