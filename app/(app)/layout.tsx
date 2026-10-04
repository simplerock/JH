import { BottomNav } from "@/components/BottomNav";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await getSession();
  return (
    <>
      <main className="mx-auto flex max-w-xl flex-col gap-7 px-4 pb-28 pt-[max(1.75rem,env(safe-area-inset-top))]">{children}</main>
      <BottomNav />
    </>
  );
}
