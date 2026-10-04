import { X } from "lucide-react";
import { deleteTask, toggleTask } from "@/app/actions";
import { recurrenceLabel } from "@/lib/dates";
import type { Profile, Task } from "@/lib/types";
import { Avatar } from "./Avatar";

type Props = {
  task: Task;
  done: boolean;
  assignee?: Profile;
  canToggle: boolean;
  canDelete?: boolean;
  /** Visa bara titeln, t.ex. för deluppgifter i ett projekt. */
  plain?: boolean;
};

export function TaskRow({ task, done, assignee, canToggle, canDelete, plain }: Props) {
  const sub = plain ? null : [task.area, recurrenceLabel[task.recurrence]].filter(Boolean).join(" · ");
  return (
    <div className="flex min-h-14 items-center gap-3 py-3">
      <form action={toggleTask}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="recurrence" value={task.recurrence} />
        <input type="hidden" name="done" value={String(done)} />
        <button
          disabled={!canToggle}
          aria-label={done ? `Ångra ${task.title}` : `Bocka av ${task.title}`}
          className={`flex size-[26px] items-center justify-center rounded-full border-2 transition ${
            done ? "border-accent bg-accent text-accent-ink" : "border-line"
          } ${canToggle ? "active:scale-90" : "opacity-35"}`}
        >
          {done && (
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
        {sub && <p className="text-[13px] text-muted">{sub}</p>}
      </div>
      {assignee && <Avatar name={assignee.display_name} color={assignee.color} size={22} />}
      {canDelete && (
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button aria-label={`Ta bort ${task.title}`} className="p-1 text-muted">
            <X size={15} />
          </button>
        </form>
      )}
    </div>
  );
}
