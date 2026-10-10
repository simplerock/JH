import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { monthRange, today } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/format";
import { loadFamilyData } from "@/lib/queries";
import { kidWeek } from "@/lib/score";
import { getUser } from "@/lib/session";

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
  const { supabase } = await getUser();
  const [from, to] = monthRange(d.slice(0, 7));
  // Allt hämtas samtidigt. Budgeten visas bara för vuxna, och RLS ger barn tomma svar.
  const [{ members, family, isParent, tasks, completions, weekFrom, adjustments, events }, { t, range }, cats, tx] = await Promise.all([
    loadFamilyData({ eventsFrom: d }),
    getI18n(),
    supabase.from("budget_categories").select("monthly_limit"),
    supabase.from("transactions").select("amount").gte("occurred_on", from).lte("occurred_on", to),
  ]);
  const next = events[0];

  let budgetSub = "";
  if (isParent) {
    const limit = (cats.data ?? []).reduce((a, c) => a + Number(c.monthly_limit), 0);
    const spent = (tx.data ?? []).reduce((a, t) => a + Number(t.amount), 0);
    budgetSub = limit > 0 ? t("{n} kr kvar den här månaden", { n: formatNumber(limit - spent) }) : t("Ingen budget än");
  }

  return (
    <>
      <PageHeader title={t("Mer")} />
      <Section>
        <Row href="/kalender" title={t("Kalender")} sub={next ? t("Nästa: {title}, {when}", { title: next.title, when: range(next.start_date, next.end_date) }) : t("Inget inplanerat")} />
        {isParent && <Row href="/vecka" title={t("Veckans genomgång")} sub={t("Veckan som gått och veckan som kommer")} />}
        <Row
          href="/poang"
          title={t("Poäng och förmåner")}
          sub={members.filter((m) => m.role === "child").map((k) => `${k.display_name} ${kidWeek(k.id, tasks, completions, weekFrom, { adjustments }).points} p`).join(", ") || t("Nivåer och förmåner")}
        />
        {isParent && <Row href="/budget" title={t("Budget")} sub={budgetSub} />}
        <Row href="/familj" title={family.name} sub={`${members.map((m) => m.display_name).join(", ")} · ${t("profil och utseende")}`} />
      </Section>
    </>
  );
}
