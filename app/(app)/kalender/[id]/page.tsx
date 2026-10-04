import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Trash2, X } from "lucide-react";
import { addChecklistItems, deleteEvent, removeChecklistItem, toggleChecklistItem, updateEvent } from "@/app/actions";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { GoalCard } from "@/components/GoalCard";
import { daysBetween, formatRange, today } from "@/lib/dates";
import { countdown, plural } from "@/lib/format";
import { checklistProgress, goalProgress } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import type { FamilyEvent } from "@/lib/types";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, goals, tasks, completions, isParent } = await loadFamilyData();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle<FamilyEvent>();
  if (!e) notFound();

  const d = today();
  const check = checklistProgress(e.checklist);
  const goal = goals.find((g) => g.id === e.goal_id);
  const length = e.end_date ? daysBetween(e.start_date, e.end_date) + 1 : 1;

  return (
    <>
      <header>
        <Link href="/kalender" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
          <ArrowLeft size={16} /> Kalender
        </Link>
        <p className="text-sm font-medium text-accent">{countdown(daysBetween(d, e.start_date))}</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{e.title}</h1>
        <p className="text-muted">
          {formatRange(e.start_date, e.end_date)} · {plural(length, "dag", "dagar")}
        </p>
        {e.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin size={14} />{e.location}</p>
        )}
      </header>

      {e.notes && <section className="card whitespace-pre-wrap leading-relaxed">{e.notes}</section>}

      {goal && <section className="group"><GoalCard goal={goal} progress={goalProgress(goal, tasks, completions)} /></section>}

      <section>
        <h2 className="section-title">Packlista {check.total > 0 && <span>{check.done} av {check.total}</span>}</h2>
        <div className="group">
        <ul className="divide-y divide-line">
          {e.checklist.map((item, i) => (
            <li key={i} className="flex min-h-12 items-center gap-3 py-2.5">
              <form action={toggleChecklistItem}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="index" value={i} />
                <button
                  disabled={!isParent}
                  aria-label={item.done ? `Ångra ${item.text}` : `Bocka av ${item.text}`}
                  className={`size-6 rounded-md border-2 ${item.done ? "border-accent bg-accent" : "border-line"}`}
                />
              </form>
              <span className={`flex-1 ${item.done ? "text-muted line-through" : ""}`}>{item.text}</span>
              {isParent && (
                <form action={removeChecklistItem}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="index" value={i} />
                  <button aria-label={`Ta bort ${item.text}`} className="p-1 text-muted"><X size={14} /></button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {e.checklist.length === 0 && <p className="py-4 text-muted">Tom lista.</p>}
        {isParent && (
          <form action={addChecklistItems} className="flex gap-2 border-t border-line py-3">
            <input type="hidden" name="id" value={e.id} />
            <input className="input" name="text" placeholder="Lägg till…" aria-label="Ny punkt" required />
            <button className="btn-ghost shrink-0">Lägg till</button>
          </form>
        )}
        </div>
      </section>

      {isParent && (
        <>
          <AddPanel title="Ändra">
            <StatefulForm action={updateEvent} resetOnOk={false}>
              <input type="hidden" name="id" value={e.id} />
              <div>
                <label className="label" htmlFor="title">Namn</label>
                <input className="input" id="title" name="title" defaultValue={e.title} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="start_date">Från</label>
                  <input className="input" id="start_date" name="start_date" type="date" defaultValue={e.start_date} required />
                </div>
                <div>
                  <label className="label" htmlFor="end_date">Till</label>
                  <input className="input" id="end_date" name="end_date" type="date" defaultValue={e.end_date ?? ""} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="location">Plats</label>
                <input className="input" id="location" name="location" defaultValue={e.location ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="notes">Info</label>
                <textarea className="input" id="notes" name="notes" rows={4} defaultValue={e.notes ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="goal_id">Kopplat mål</label>
                <select className="input" id="goal_id" name="goal_id" defaultValue={e.goal_id ?? ""}>
                  <option value="">Inget</option>
                  {goals.filter((g) => !g.archived || g.id === e.goal_id).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              <SubmitButton>Spara</SubmitButton>
            </StatefulForm>
          </AddPanel>
          <form action={deleteEvent} className="text-center">
            <input type="hidden" name="id" value={e.id} />
            <button className="inline-flex items-center gap-1 text-sm text-warn"><Trash2 size={14} /> Ta bort</button>
          </form>
        </>
      )}
    </>
  );
}
