import { Camera } from "lucide-react";
import { claimTask } from "@/app/actions";
import { getI18n } from "@/lib/i18n/server";
import type { Task } from "@/lib/types";
import { Section } from "./Section";

/** Lediga sysslor som barnet kan välja. Den som tar en syssla får den som sin. */
export async function FreeChores({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;
  const { t, recurrence } = await getI18n();
  return (
    <Section title={t("Välj en syssla")} aside={t("{n} lediga", { n: tasks.length })}>
      {tasks.map((task) => (
        <div key={task.id} className="flex min-h-14 items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{task.title}</p>
            <p className="text-[13px] text-muted">{[task.area, recurrence(task.recurrence)].filter(Boolean).join(" · ")}</p>
          </div>
          {task.points > 0 && (
            <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums text-muted">
              {task.requires_photo && <Camera size={14} aria-label={t("Kräver foto")} />}
              {task.points} p
            </span>
          )}
          <form action={claimTask}>
            <input type="hidden" name="id" value={task.id} />
            <button className="btn-ghost" aria-label={t("Ta {title}", { title: task.title })}>{t("Ta den")}</button>
          </form>
        </div>
      ))}
    </Section>
  );
}

/** Sysslor som ingen har och som inte hör till en resa eller ett projekt. */
export const freeChores = (tasks: Task[]) => tasks.filter((t) => !t.assignee && !t.event_id && !t.project_id);
