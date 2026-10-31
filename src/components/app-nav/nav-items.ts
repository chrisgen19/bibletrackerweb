import {
  House,
  type LucideIcon,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Whether this tab owns `pathname`, including the screens pushed from it. */
  match: (pathname: string) => boolean;
}

const startsWith = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The app's tabs, in order. One list, so every nav variant agrees on what is active. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: House,
    match: (pathname) => pathname === "/" || startsWith(pathname, "/day"),
  },
  {
    href: "/history",
    label: "History",
    icon: ScrollText,
    match: (pathname) => startsWith(pathname, "/history"),
  },
  {
    href: "/friends",
    label: "Friends",
    icon: Users,
    match: (pathname) => startsWith(pathname, "/friends"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
    match: (pathname) =>
      ["/profile", "/settings", "/reading-plan"].some((prefix) =>
        startsWith(pathname, prefix),
      ),
  },
];

/** Onboarding is a guided flow with its own way forward: no tabs there. */
export const showsNav = (pathname: string): boolean =>
  !startsWith(pathname, "/onboarding");
