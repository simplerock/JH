import { BottomNav } from "@/components/BottomNav";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, isParent } = await getSession();
  const { count } = isParent
    ? await supabase.from("task_completions").select("id", { count: "exact", head: true }).eq("status", "pending")
    : { count: 0 };
  return (
    <>
      <main className="mx-auto flex max-w-xl flex-col gap-7 px-4 pb-28 pt-[max(1.75rem,env(safe-area-inset-top))]">{children}</main>
      <BottomNav badge={count ?? 0} />
    </>
  );
}
