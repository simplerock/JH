import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { formatRange, monthRange, today } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { weekPoints } from "@/lib/progress";
import { loadEvents, loadFamilyData } from "@/lib/queries";

function Row({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="truncate text-[13px] text-muted">{sub}</p>
      </div>
      <ChevronRight size={18} className="text-muted" />
    </Link>
  );
}

export default async function MorePage() {
  const d = today();
  const [{ supabase, members, family, isParent, tasks, completions, weekFrom }, events] = await Promise.all([loadFamilyData(), loadEvents(d)]);
  const next = events[0];

  let budgetSub = "";
  if (isParent) {
    const [from, to] = monthRange(d.slice(0, 7));
    const [cats, tx] = await Promise.all([
      supabase.from("budget_categories").select("monthly_limit"),
      supabase.from("transactions").select("amount").gte("occurred_on", from).lte("occurred_on", to),
    ]);
    const limit = (cats.data ?? []).reduce((a, c) => a + Number(c.monthly_limit), 0);
    const spent = (tx.data ?? []).reduce((a, t) => a + Number(t.amount), 0);
    budgetSub = limit > 0 ? `${formatNumber(limit - spent)} kr kvar den här månaden` : "Ingen budget än";
  }

  return (
    <>
      <PageHeader title="Mer" />
      <Section>
        <Row href="/kalender" title="Kalender" sub={next ? `Nästa: ${next.title}, ${formatRange(next.start_date, next.end_date)}` : "Inget inplanerat"} />
        <Row
          href="/poang"
          title="Poäng och förmåner"
          sub={members.filter((m) => m.role === "child").map((k) => `${k.display_name} ${weekPoints(k.id, completions, tasks, weekFrom)} p`).join(", ") || "Nivåer och förmåner"}
        />
        {isParent && <Row href="/budget" title="Budget" sub={budgetSub} />}
        <Row href="/familj" title={family.name} sub={members.map((m) => m.display_name).join(", ")} />
      </Section>
    </>
  );
}
