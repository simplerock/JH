"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Target, Users, Sparkles } from "lucide-react";

const items = [
  { href: "/", label: "Hem", icon: Home },
  { href: "/mal", label: "Mål", icon: Target },
  { href: "/rutiner", label: "Rutiner", icon: Sparkles },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/familj", label: "Familj", icon: Users },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
