import { BottomNav } from "@/components/BottomNav";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await getSession();
  return (
    <>
      <main className="mx-auto max-w-xl px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</main>
      <BottomNav />
    </>
  );
}
