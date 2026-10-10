import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { RefreshOnFocus } from "@/components/RefreshOnFocus";
import { getI18n } from "@/lib/i18n/server";
import { currentPeriods } from "@/lib/progress";
import { getSession } from "@/lib/session";

// Layouten väntar inte på databasen. Menyn och sidans laddningsskiss (loading.tsx) skickas direkt,
// så att telefonen hämtar JavaScript medan servern hämtar data. Plusknappen och siffran fylls i när de är klara.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto flex max-w-xl flex-col gap-7 px-4 pb-40 pt-[max(1.75rem,env(safe-area-inset-top))]">{children}</main>
      <Suspense>
        <AddButton />
      </Suspense>
      <BottomNav
        homeBadge={
          <Suspense>
            <HomeBadge />
          </Suspense>
        }
      />
      <RefreshOnFocus />
    </>
  );
}

async function AddButton() {
  const [{ isParent }, { t }] = await Promise.all([getSession(), getI18n()]);
  if (!isParent) return null;
  return (
    <Link
      href="/ny"
      aria-label={t("Lägg till")}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/15 transition active:scale-95"
    >
      <Plus size={26} strokeWidth={2.4} />
    </Link>
  );
}

/** Vuxna ser hur många inskick som väntar, barn hur många av deras sysslor som ska göras om (just nu, inte gamla perioder). */
async function HomeBadge() {
  // Profilen hämtas ändå av sidan (getSession är cachad), så bara den räkning som gäller skickas.
  const [{ supabase, user, isParent }, { t }] = await Promise.all([getSession(), getI18n()]);
  const query = supabase.from("task_completions").select("id", { count: "exact", head: true });
  const { count: n } = isParent
    ? await query.eq("status", "pending")
    : await query.eq("status", "redo").eq("completed_by", user.id).in("period", currentPeriods());
  const count = n ?? 0;
  if (count === 0) return null;
  const label = isParent ? t("{n} att godkänna", { n: count }) : t("{n} att göra om", { n: count });
  return (
    <span className="absolute left-1/2 top-1.5 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-wait px-1 text-[10px] font-bold text-card" aria-label={label}>
      {count}
    </span>
  );
}
