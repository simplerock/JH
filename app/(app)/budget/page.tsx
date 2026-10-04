import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { addTransaction, createCategory, deleteCategory, deleteTransaction, updateCategory, updateTransaction } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { Empty, Section } from "@/components/Section";
import { monthRange, shiftMonth, today } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/format";
import { budgetSummary } from "@/lib/progress";
import { getSession } from "@/lib/session";
import type { BudgetCategory, Transaction } from "@/lib/types";

const kr = (n: number) => `${formatNumber(n)} kr`;

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ manad?: string; ny?: string }> }) {
  const [{ supabase, isParent }, { t, date, month: monthName }] = await Promise.all([getSession(), getI18n()]);
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
      <PageHeader title={t("Budget")} back={{ href: "/mer", label: t("Mer") }} />

      <div className="flex items-center justify-between">
        <Link href={`/budget?manad=${shiftMonth(month, -1)}`} className="btn-ghost px-2" aria-label={t("Förra månaden")}><ChevronLeft size={18} /></Link>
        <span className="font-semibold capitalize">{monthName(month)}</span>
        <Link
          href={`/budget?manad=${shiftMonth(month, 1)}`}
          className={`btn-ghost px-2 ${month >= current ? "pointer-events-none opacity-30" : ""}`}
          aria-label={t("Nästa månad")}
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      {categories.length > 0 && (
        <Section>
          <div className="py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold tabular-nums ${sum.left < 0 ? "text-warn" : ""}`}>{kr(sum.left)}</span>
              <span className="text-sm text-muted">{t("kvar av {total}", { total: kr(sum.limit) })}</span>
            </div>
            <ProgressBar ratio={sum.ratio} over={sum.left < 0} />
          </div>
        </Section>
      )}

      <Section title={t("Kategorier")}>
        {categories.length === 0 && <Empty>{t("Börja med några kategorier, till exempel mat, bil och nöje.")}</Empty>}
        {sum.rows.map(({ category, spent, left, over, ratio }) => (
          <details key={category.id}>
            <summary className="cursor-pointer list-none py-3.5">
              <ProgressBar ratio={ratio} label={category.name} detail={over ? t("{n} över", { n: kr(-left) }) : t("{n} kvar", { n: kr(left) })} over={over} thin />
            </summary>
            <div className="pb-4">
              <p className="mb-3 text-[13px] text-muted">{t("{spent} av {limit} den här månaden", { spent: kr(spent), limit: kr(Number(category.monthly_limit)) })}</p>
              <StatefulForm action={updateCategory} resetOnOk={false}>
                <input type="hidden" name="id" value={category.id} />
                <div className="grid grid-cols-[1fr_7rem] gap-3">
                  <input className="input" name="name" defaultValue={category.name} aria-label={t("Ändra namn")} required />
                  <input className="input" name="monthly_limit" defaultValue={Number(category.monthly_limit)} inputMode="decimal" aria-label={t("Ändra budget per månad")} required />
                </div>
                <div className="flex items-center justify-between">
                  <SubmitButton className="btn-ghost">{t("Spara")}</SubmitButton>
                  <button form={`del-${category.id}`} className="flex items-center gap-1 text-sm text-warn"><X size={14} /> {t("Ta bort")}</button>
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
        <AddPanel title={t("Ny utgift")} open={ny === "1"}>
          <StatefulForm action={addTransaction}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="amount">{t("Belopp (kr)")}</label>
                <input className="input" id="amount" name="amount" inputMode="decimal" required />
              </div>
              <div>
                <label className="label" htmlFor="category_id">{t("Kategori")}</label>
                <select className="input" id="category_id" name="category_id">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="note">{t("Vad")}</label>
                <input className="input" id="note" name="note" placeholder="ICA" />
              </div>
              <div>
                <label className="label" htmlFor="occurred_on">{t("Datum")}</label>
                <input className="input" id="occurred_on" name="occurred_on" type="date" defaultValue={month === current ? today() : from} />
              </div>
            </div>
            <SubmitButton>{t("Spara")}</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      {transactions.length > 0 && (
        <Section title={t("Utgifter")} aside={kr(sum.spent)}>
          {transactions.map((row) => (
            <details key={row.id}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.note || (row.category_id && catName.get(row.category_id)) || t("Utgift")}</p>
                  <p className="text-[13px] text-muted">{[row.category_id && catName.get(row.category_id), date(row.occurred_on)].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="tabular-nums">{kr(Number(row.amount))}</span>
              </summary>
              <div className="pb-4">
                <StatefulForm action={updateTransaction} resetOnOk={false}>
                  <input type="hidden" name="id" value={row.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input" name="amount" defaultValue={Number(row.amount)} inputMode="decimal" aria-label={t("Ändra belopp")} required />
                    <select className="input" name="category_id" defaultValue={row.category_id ?? ""} aria-label={t("Ändra kategori")}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input className="input" name="note" defaultValue={row.note ?? ""} aria-label={t("Ändra vad")} />
                    <input className="input" name="occurred_on" type="date" defaultValue={row.occurred_on} aria-label={t("Ändra datum")} />
                  </div>
                  <div className="flex items-center justify-between">
                    <SubmitButton className="btn-ghost">{t("Spara")}</SubmitButton>
                    <button form={`del-tx-${row.id}`} className="flex items-center gap-1 text-sm text-warn"><X size={14} /> {t("Ta bort")}</button>
                  </div>
                </StatefulForm>
                <form id={`del-tx-${row.id}`} action={deleteTransaction}>
                  <input type="hidden" name="id" value={row.id} />
                </form>
              </div>
            </details>
          ))}
        </Section>
      )}

      <AddPanel title={t("Ny kategori")}>
        <StatefulForm action={createCategory}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="name">{t("Namn")}</label>
              <input className="input" id="name" name="name" placeholder={t("Mat")} required />
            </div>
            <div>
              <label className="label" htmlFor="monthly_limit">{t("Per månad (kr)")}</label>
              <input className="input" id="monthly_limit" name="monthly_limit" inputMode="decimal" required />
            </div>
          </div>
          <SubmitButton>{t("Lägg till")}</SubmitButton>
        </StatefulForm>
      </AddPanel>
    </>
  );
}
