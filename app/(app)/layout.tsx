import Link from "next/link";
import { Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { RefreshOnFocus } from "@/components/RefreshOnFocus";
import { getI18n } from "@/lib/i18n/server";
import { currentPeriods } from "@/lib/progress";
import { getSession, getUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  // Siffran på Hem hämtas samtidigt som profilen: vuxna ser hur många inskick som väntar,
  // barn hur många av deras sysslor som ska göras om (just nu, inte gamla perioder).
  const [{ isParent }, { t }, pending, redo] = await Promise.all([
    getSession(),
    getI18n(),
    supabase.from("task_completions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .eq("status", "redo")
      .eq("completed_by", user.id)
      .in("period", currentPeriods()),
  ]);
  const count = (isParent ? pending.count : redo.count) ?? 0;
  const badge = { count, label: isParent ? t("{n} att godkänna", { n: count }) : t("{n} att göra om", { n: count }) };
  return (
    <>
      <main className={`mx-auto flex max-w-xl flex-col gap-7 px-4 pt-[max(1.75rem,env(safe-area-inset-top))] ${isParent ? "pb-40" : "pb-28"}`}>{children}</main>
      {isParent && (
        <Link
          href="/ny"
          aria-label={t("Lägg till")}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/15 transition active:scale-95"
        >
          <Plus size={26} strokeWidth={2.4} />
        </Link>
      )}
      <BottomNav badge={badge} />
      <RefreshOnFocus />
    </>
  );
}
