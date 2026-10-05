import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, MapPin, Trash2, X } from "lucide-react";
import { addChecklistItems, createTask, deleteEvent, deleteEventFile, removeChecklistItem, toggleChecklistItem, updateEvent } from "@/app/actions";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { OwnerSelect } from "@/components/OwnerSelect";
import { Empty, Section } from "@/components/Section";
import { TaskRow } from "@/components/TaskRow";
import { aiEnabled } from "@/lib/ai/trip";
import { readDetails } from "@/lib/trip";
import { currentCompletion } from "@/lib/progress";
import { TripEditor } from "./TripEditor";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { GoalCard } from "@/components/GoalCard";
import { daysBetween, today } from "@/lib/dates";
import { countdown } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { checklistProgress, goalProgress } from "@/lib/progress";
import { loadFamilyData } from "@/lib/queries";
import { getUser } from "@/lib/session";
import type { EventFile, FamilyEvent } from "@/lib/types";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const [{ goals, tasks, completions, isParent, profile, members, family }, { t, date, range, time }, { data: e }, { data: fileRows }] = await Promise.all([
    loadFamilyData(),
    getI18n(),
    supabase.from("events").select("*").eq("id", id).maybeSingle<FamilyEvent>(),
    supabase.from("event_files").select("*").eq("event_id", id).order("created_at").returns<EventFile[]>(),
  ]);
  if (!e) notFound();
  const files = fileRows ?? [];
  const { data: signed } = files.length
    ? await supabase.storage.from("resor").createSignedUrls(files.map((f) => f.path), 3600)
    : { data: [] };
  const urls = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
  const byId = new Map(members.map((m) => [m.id, m]));
  const details = readDetails(e.details);
  const trip = e.kind === "vacation";
  const tripTasks = tasks.filter((t) => t.event_id === e.id);
  const updatedBy = e.updated_by ? byId.get(e.updated_by)?.display_name : null;
  const updated = time(e.updated_at, { day: "numeric", month: "short" });

  const d = today();
  const check = checklistProgress(e.checklist);
  const goal = goals.find((g) => g.id === e.goal_id);
  const length = e.end_date ? daysBetween(e.start_date, e.end_date) + 1 : 1;

  return (
    <>
      <header>
        <Link href="/kalender" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
          <ArrowLeft size={16} /> {t("Kalender")}
        </Link>
        <p className="text-sm font-medium text-accent">{countdown(daysBetween(d, e.start_date), t)}</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{e.title}</h1>
        <p className="text-muted">
          {range(e.start_date, e.end_date)} · {length === 1 ? t("1 dag") : t("{n} dagar", { n: length })}
        </p>
        {e.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin size={14} />{e.location}</p>
        )}
        {trip && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.booked ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>
              {e.booked ? t("Bokat") : t("Inte bokat")}
            </span>
            {updatedBy ? t("Uppdaterad {date} av {name}", { date: updated, name: updatedBy }) : t("Uppdaterad {date}", { date: updated })}
          </p>
        )}
      </header>

      {details.flights.length > 0 && (
        <Section title={t("Flyg")}>
          {details.flights.map((f, i) => (
            <div key={i} className="py-3">
              <p className="font-medium">{[f.from, f.to].filter(Boolean).join(" → ") || t("Flyg")}</p>
              <p className="text-[13px] text-muted">
                {[f.date && date(f.date), f.flight_no, f.depart && f.arrive ? `${f.depart}–${f.arrive}` : f.depart].filter(Boolean).join(" · ")}
              </p>
              {f.booking_ref && <p className="text-[13px] font-medium tabular-nums">{t("Bokning {ref}", { ref: f.booking_ref })}</p>}
            </div>
          ))}
        </Section>
      )}

      {details.important.length > 0 && (
        <Section title={t("Viktigt att veta")}>
          <ul className="list-disc space-y-1.5 py-3.5 pl-5 marker:text-muted">
            {details.important.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Section>
      )}

      {details.hotels.length > 0 && (
        <Section title={t("Hotell")}>
          {details.hotels.map((h, i) => (
            <div key={i} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{h.name}</p>
                {(h.address || h.phone) && <p className="text-[13px] text-muted">{[h.address, h.phone].filter(Boolean).join(" · ")}</p>}
              </div>
              {h.check_in && <span className="shrink-0 text-sm text-muted">{range(h.check_in, h.check_out)}</span>}
            </div>
          ))}
        </Section>
      )}

      {details.days.length > 0 && (
        <Section title={t("Program")}>
          <ol className="list-decimal space-y-2 py-3.5 pl-6 marker:text-muted">
            {details.days.map((x, i) => <li key={i}>{x.date ? <span className="text-muted">{date(x.date)}: </span> : null}{x.text}</li>)}
          </ol>
        </Section>
      )}

      {(files.length > 0 || isParent) && trip && (
        <Section title={t("Dokument")}>
          {files.length === 0 && <Empty>{t("Inga dokument än.")}</Empty>}
          {files.map((f) => (
            <div key={f.id} className="flex min-h-12 items-center gap-3 py-2.5">
              <FileText size={18} className="shrink-0 text-muted" />
              <a href={urls.get(f.path) ?? "#"} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium">{f.name}</a>
              {isParent && (
                <ConfirmDelete action={deleteEventFile} id={f.id} label={t("Ta bort {title}", { title: f.name })} />
              )}
            </div>
          ))}
          {isParent && (
            <div className="py-4">
              <TripEditor
                eventId={e.id}
                familyId={family.id}
                ai={aiEnabled()}
                current={{
                  ...details,
                  title: e.title,
                  start_date: e.start_date,
                  end_date: e.end_date,
                  location: e.location,
                  booked: e.booked,
                  packing: [],
                  packingNew: [],
                }}
              />
            </div>
          )}
        </Section>
      )}

      {trip && (tripTasks.length > 0 || isParent) && (
        <Section
          title={t("Inför resan")}
          aside={tripTasks.length ? t("{done} av {total}", { done: tripTasks.filter((x) => currentCompletion(x, completions)?.status === "approved").length, total: tripTasks.length }) : undefined}
        >
          {tripTasks.map((task) => (
            <TaskRow key={task.id} task={task} completion={currentCompletion(task, completions)} me={profile} assignee={task.assignee ? byId.get(task.assignee) : undefined} showAssignee canDelete={isParent} />
          ))}
          {isParent && (
            <details className="py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-accent">+ {t("Lägg till uppgift")}</summary>
              <StatefulForm action={createTask} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="event_id" value={e.id} />
                <input type="hidden" name="recurrence" value="none" />
                <input className="input" name="title" placeholder={t("Boka flyg, packa väskan…")} aria-label={t("Uppgift")} required />
                <div className="grid grid-cols-2 gap-3">
                  <select className="input" name="assignee" aria-label={t("Vem")} defaultValue="">
                    <option value="">{t("Vem som helst")}</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                  </select>
                  <input className="input" name="due_date" type="date" aria-label={t("Senast")} max={e.start_date} />
                </div>
                <div className="grid grid-cols-2 items-center gap-3">
                  <input className="input" name="points" inputMode="numeric" defaultValue="5" aria-label={t("Poäng (barn)")} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_photo" className="size-5 accent-[var(--accent)]" /> {t("Kräver foto")}</label>
                </div>
                <SubmitButton>{t("Lägg till")}</SubmitButton>
              </StatefulForm>
            </details>
          )}
        </Section>
      )}

      {e.notes && <section className="card whitespace-pre-wrap leading-relaxed">{e.notes}</section>}

      {goal && <section className="group"><GoalCard goal={goal} progress={goalProgress(goal, tasks, completions)} /></section>}

      <section>
        <h2 className="section-title">{t("Packlista")} {check.total > 0 && <span>{t("{done} av {total}", { done: check.done, total: check.total })}</span>}</h2>
        <div className="group">
        <ul className="divide-y divide-line">
          {e.checklist.map((item, i) => (
            <li key={i} className="flex min-h-12 items-center gap-3 py-2.5">
              <form action={toggleChecklistItem}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="index" value={i} />
                <button
                  disabled={!isParent}
                  aria-label={item.done ? t("Ångra {title}", { title: item.text }) : t("Bocka av {title}", { title: item.text })}
                  className={`size-6 rounded-md border-2 ${item.done ? "border-accent bg-accent" : "border-line"}`}
                />
              </form>
              <span className={`flex-1 ${item.done ? "text-muted line-through" : ""}`}>{item.text}</span>
              {isParent && (
                <form action={removeChecklistItem}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="index" value={i} />
                  <button aria-label={t("Ta bort {title}", { title: item.text })} className="p-1 text-muted"><X size={14} /></button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {e.checklist.length === 0 && <p className="py-4 text-muted">{t("Tom lista.")}</p>}
        {isParent && (
          <form action={addChecklistItems} className="flex gap-2 border-t border-line py-3">
            <input type="hidden" name="id" value={e.id} />
            <input className="input" name="text" placeholder={t("Lägg till…")} aria-label={t("Ny punkt")} required />
            <button className="btn-ghost shrink-0">{t("Lägg till")}</button>
          </form>
        )}
        </div>
      </section>

      {isParent && (
        <>
          <AddPanel title={t("Ändra")}>
            <StatefulForm action={updateEvent} resetOnOk={false}>
              <input type="hidden" name="id" value={e.id} />
              <div>
                <label className="label" htmlFor="title">{t("Namn")}</label>
                <input className="input" id="title" name="title" defaultValue={e.title} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="start_date">{t("Från")}</label>
                  <input className="input" id="start_date" name="start_date" type="date" defaultValue={e.start_date} required />
                </div>
                <div>
                  <label className="label" htmlFor="end_date">{t("Till")}</label>
                  <input className="input" id="end_date" name="end_date" type="date" defaultValue={e.end_date ?? ""} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="location">{t("Plats")}</label>
                <input className="input" id="location" name="location" defaultValue={e.location ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="notes">{t("Info")}</label>
                <textarea className="input" id="notes" name="notes" rows={4} defaultValue={e.notes ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="goal_id">{t("Kopplat mål")}</label>
                <select className="input" id="goal_id" name="goal_id" defaultValue={e.goal_id ?? ""}>
                  <option value="">{t("Inget")}</option>
                  {goals.filter((g) => !g.archived || g.id === e.goal_id).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              <OwnerSelect members={members.filter((m) => m.role === "parent")} defaultValue={e.owner ?? ""} label={t("Planerar")} />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="booked" defaultChecked={e.booked} className="size-5 accent-[var(--accent)]" /> {t("Bokat")}
              </label>
              <SubmitButton>{t("Spara")}</SubmitButton>
            </StatefulForm>
          </AddPanel>
          <form action={deleteEvent} className="text-center">
            <input type="hidden" name="id" value={e.id} />
            <button className="inline-flex items-center gap-1 text-sm text-warn"><Trash2 size={14} /> {t("Ta bort")}</button>
          </form>
        </>
      )}
    </>
  );
}
