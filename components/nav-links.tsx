"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Boxes, LayoutDashboard, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resources", label: "Resources", icon: Boxes },
  { href: "/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/reservations/new", label: "New booking", icon: Plus },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/reservations"
            ? pathname === "/reservations"
            : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}