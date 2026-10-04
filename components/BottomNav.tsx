"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Ellipsis, Home, Hammer, Target } from "lucide-react";

const items = [
  { href: "/", label: "Hem", icon: Home, match: ["/"] },
  { href: "/mal", label: "Mål", icon: Target, match: ["/mal"] },
  { href: "/rutiner", label: "Rutiner", icon: Check, match: ["/rutiner"] },
  { href: "/hemmet", label: "Hemmet", icon: Hammer, match: ["/hemmet"] },
  { href: "/mer", label: "Mer", icon: Ellipsis, match: ["/mer", "/kalender", "/budget", "/familj", "/poang"] },
];

export function BottomNav({ badge = 0 }: { badge?: number }) {
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
                className={`relative flex flex-col items-center gap-0.5 pb-3 pt-2.5 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
                {label}
                {href === "/" && badge > 0 && (
                  <span className="absolute left-1/2 top-1.5 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-wait px-1 text-[10px] font-bold text-card" aria-label={`${badge} att godkänna`}>
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
