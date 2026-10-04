import Link from "next/link";
import { Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, isParent } = await getSession();
  const { count } = isParent
    ? await supabase.from("task_completions").select("id", { count: "exact", head: true }).eq("status", "pending")
    : { count: 0 };
  return (
    <>
      <main className={`mx-auto flex max-w-xl flex-col gap-7 px-4 pt-[max(1.75rem,env(safe-area-inset-top))] ${isParent ? "pb-40" : "pb-28"}`}>{children}</main>
      {isParent && (
        <Link
          href="/ny"
          aria-label="Lägg till"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/15 transition active:scale-95"
        >
          <Plus size={26} strokeWidth={2.4} />
        </Link>
      )}
      <BottomNav badge={count ?? 0} />
    </>
  );
}
