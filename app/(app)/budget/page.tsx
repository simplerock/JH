import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { addTransaction, createCategory, deleteCategory, deleteTransaction, updateCategory, updateTransaction } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { Empty, Section } from "@/components/Section";
import { formatDate, monthName, monthRange, shiftMonth, today } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { budgetSummary } from "@/lib/progress";
import { getSession } from "@/lib/session";
import type { BudgetCategory, Transaction } from "@/lib/types";

const kr = (n: number) => `${formatNumber(n)} kr`;

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ manad?: string; ny?: string }> }) {
  const { supabase, isParent } = await getSession();
  if (!isParent) redirect("/mer");

  const { manad, ny } = await searchParams;
  const current = today().slice(0, 7);
  const month = manad && /^\d{4}-\d{2}$/.test(manad) ? manad : current;
  const [from, to] = monthRange(month);

  const [cats, tx] = await Promise.all([
    supabase.from("budget_categories").select("*").order("name").returns<BudgetCategory[]>(),
    supabase.from("transactions").select("*").gte("occurred_on", from).lte("occurred_on", to).order("occurred_on", { ascending: false }).returns<Transaction[]>(),
  ]);
  const categories = cats.data ?? [];
  const transactions = tx.data ?? [];
  const sum = budgetSummary(categories, transactions);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader title="Budget" back={{ href: "/mer", label: "Mer" }} />

      <div className="flex items-center justify-between">
        <Link href={`/budget?manad=${shiftMonth(month, -1)}`} className="btn-ghost px-2" aria-label="Förra månaden"><ChevronLeft size={18} /></Link>
        <span className="font-semibold capitalize">{monthName(month)}</span>
        <Link
          href={`/budget?manad=${shiftMonth(month, 1)}`}
          className={`btn-ghost px-2 ${month >= current ? "pointer-events-none opacity-30" : ""}`}
          aria-label="Nästa månad"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      {categories.length > 0 && (
        <Section>
          <div className="py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold tabular-nums ${sum.left < 0 ? "text-warn" : ""}`}>{kr(sum.left)}</span>
              <span className="text-sm text-muted">kvar av {kr(sum.limit)}</span>
            </div>
            <ProgressBar ratio={sum.ratio} over={sum.left < 0} />
          </div>
        </Section>
      )}

      <Section title="Kategorier">
        {categories.length === 0 && <Empty>Börja med några kategorier, till exempel mat, bil och nöje.</Empty>}
        {sum.rows.map(({ category, spent, left, over, ratio }) => (
          <details key={category.id}>
            <summary className="cursor-pointer list-none py-3.5">
              <ProgressBar ratio={ratio} label={category.name} detail={over ? `${kr(-left)} över` : `${kr(left)} kvar`} over={over} thin />
            </summary>
            <div className="pb-4">
              <p className="mb-3 text-[13px] text-muted">{kr(spent)} av {kr(Number(category.monthly_limit))} den här månaden</p>
              <StatefulForm action={updateCategory} resetOnOk={false}>
                <input type="hidden" name="id" value={category.id} />
                <div className="grid grid-cols-[1fr_7rem] gap-3">
                  <input className="input" name="name" defaultValue={category.name} aria-label="Ändra namn" required />
                  <input className="input" name="monthly_limit" defaultValue={Number(category.monthly_limit)} inputMode="decimal" aria-label="Ändra budget per månad" required />
                </div>
                <div className="flex items-center justify-between">
                  <SubmitButton className="btn-ghost">Spara</SubmitButton>
                  <button form={`del-${category.id}`} className="flex items-center gap-1 text-sm text-warn"><X size={14} /> Ta bort</button>
                </div>
              </StatefulForm>
              <form id={`del-${category.id}`} action={deleteCategory}>
                <input type="hidden" name="id" value={category.id} />
              </form>
            </div>
          </details>
        ))}
      </Section>

      {categories.length > 0 && (
        <AddPanel title="Ny utgift" open={ny === "1"}>
          <StatefulForm action={addTransaction}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="amount">Belopp (kr)</label>
                <input className="input" id="amount" name="amount" inputMode="decimal" required />
              </div>
              <div>
                <label className="label" htmlFor="category_id">Kategori</label>
                <select className="input" id="category_id" name="category_id">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="note">Vad</label>
                <input className="input" id="note" name="note" placeholder="ICA" />
              </div>
              <div>
                <label className="label" htmlFor="occurred_on">Datum</label>
                <input className="input" id="occurred_on" name="occurred_on" type="date" defaultValue={month === current ? today() : from} />
              </div>
            </div>
            <SubmitButton>Spara</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      {transactions.length > 0 && (
        <Section title="Utgifter" aside={kr(sum.spent)}>
          {transactions.map((t) => (
            <details key={t.id}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.note || (t.category_id && catName.get(t.category_id)) || "Utgift"}</p>
                  <p className="text-[13px] text-muted">{[t.category_id && catName.get(t.category_id), formatDate(t.occurred_on)].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="tabular-nums">{kr(Number(t.amount))}</span>
              </summary>
              <div className="pb-4">
                <StatefulForm action={updateTransaction} resetOnOk={false}>
                  <input type="hidden" name="id" value={t.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input" name="amount" defaultValue={Number(t.amount)} inputMode="decimal" aria-label="Ändra belopp" required />
                    <select className="input" name="category_id" defaultValue={t.category_id ?? ""} aria-label="Ändra kategori">
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input className="input" name="note" defaultValue={t.note ?? ""} aria-label="Ändra vad" />
                    <input className="input" name="occurred_on" type="date" defaultValue={t.occurred_on} aria-label="Ändra datum" />
                  </div>
                  <div className="flex items-center justify-between">
                    <SubmitButton className="btn-ghost">Spara</SubmitButton>
                    <button form={`del-tx-${t.id}`} className="flex items-center gap-1 text-sm text-warn"><X size={14} /> Ta bort</button>
                  </div>
                </StatefulForm>
                <form id={`del-tx-${t.id}`} action={deleteTransaction}>
                  <input type="hidden" name="id" value={t.id} />
                </form>
              </div>
            </details>
          ))}
        </Section>
      )}

      <AddPanel title="Ny kategori">
        <StatefulForm action={createCategory}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="name">Namn</label>
              <input className="input" id="name" name="name" placeholder="Mat" required />
            </div>
            <div>
              <label className="label" htmlFor="monthly_limit">Per månad (kr)</label>
              <input className="input" id="monthly_limit" name="monthly_limit" inputMode="decimal" required />
            </div>
          </div>
          <SubmitButton>Lägg till</SubmitButton>
        </StatefulForm>
      </AddPanel>
    </>
  );
}
