"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Check, Ellipsis, Home, Hammer, Target } from "lucide-react";
import { useI18n } from "./I18nProvider";

const items = [
  { href: "/", label: "Hem", icon: Home, match: ["/"] },
  { href: "/mal", label: "Mål", icon: Target, match: ["/mal"] },
  { href: "/rutiner", label: "Rutiner", icon: Check, match: ["/rutiner"] },
  { href: "/hemmet", label: "Hemmet", icon: Hammer, match: ["/hemmet"] },
  { href: "/mer", label: "Mer", icon: Ellipsis, match: ["/mer", "/kalender", "/budget", "/familj", "/poang", "/vecka", "/barn"] },
];

/** homeBadge: siffran på Hem. Den kommer från servern när den är klar, så menyn kan visas direkt. */
export function BottomNav({ homeBadge }: { homeBadge?: ReactNode }) {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = href === "/" ? path === "/" : match.some((m) => path.startsWith(m));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                prefetch
                className={`relative flex flex-col items-center gap-0.5 pb-3 pt-2.5 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}
                aria-current={active ? "page" : undefined}
              >
                <Pending />
                <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
                {t(label)}
                {href === "/" && homeBadge}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tunn rad överst på fliken medan sidan laddas, så att trycket syns direkt. */
function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent transition-opacity ${pending ? "animate-pulse opacity-100" : "opacity-0"}`} />;
}
