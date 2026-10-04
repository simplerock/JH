import { Camera } from "lucide-react";
import { claimTask } from "@/app/actions";
import { recurrenceLabel } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { Section } from "./Section";

/** Lediga sysslor som barnet kan välja. Den som tar en syssla får den som sin. */
export function FreeChores({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;
  return (
    <Section title="Välj en syssla" aside={`${tasks.length} lediga`}>
      {tasks.map((t) => (
        <div key={t.id} className="flex min-h-14 items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t.title}</p>
            <p className="text-[13px] text-muted">{[t.area, recurrenceLabel[t.recurrence]].filter(Boolean).join(" · ")}</p>
          </div>
          {t.points > 0 && (
            <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums text-muted">
              {t.requires_photo && <Camera size={14} aria-label="Kräver foto" />}
              {t.points} p
            </span>
          )}
          <form action={claimTask}>
            <input type="hidden" name="id" value={t.id} />
            <button className="btn-ghost" aria-label={`Ta ${t.title}`}>Ta den</button>
          </form>
        </div>
      ))}
    </Section>
  );
}

/** Sysslor som ingen har och som inte hör till en resa eller ett projekt. */
export const freeChores = (tasks: Task[]) => tasks.filter((t) => !t.assignee && !t.event_id && !t.project_id);
