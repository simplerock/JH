"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Ellipsis, Home, Hammer, Target } from "lucide-react";

const items = [
  { href: "/", label: "Hem", icon: Home, match: ["/"] },
  { href: "/mal", label: "Mål", icon: Target, match: ["/mal"] },
  { href: "/rutiner", label: "Rutiner", icon: Check, match: ["/rutiner"] },
  { href: "/hemmet", label: "Hemmet", icon: Hammer, match: ["/hemmet"] },
  { href: "/mer", label: "Mer", icon: Ellipsis, match: ["/mer", "/kalender", "/budget", "/familj"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = href === "/" ? path === "/" : match.some((m) => path.startsWith(m));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 pb-3 pt-2.5 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
