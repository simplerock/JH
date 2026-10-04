import { Camera, X } from "lucide-react";
import { deleteTask, submitCompletion, toggleTask } from "@/app/actions";
import { formatDate, recurrenceLabel } from "@/lib/dates";
import type { Completion, Profile, Task } from "@/lib/types";
import { Avatar } from "./Avatar";
import { PhotoSubmit } from "./PhotoSubmit";

type Props = {
  task: Task;
  completion?: Completion;
  /** Den som är inloggad. */
  me: Profile;
  assignee?: Profile;
  showAssignee?: boolean;
  canDelete?: boolean;
  /** Visa bara titeln, t.ex. för steg i ett projekt. */
  plain?: boolean;
};

const Tick = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
    <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const circle = "flex size-[26px] items-center justify-center rounded-full border-2 transition";

export function TaskRow({ task, completion, me, assignee, showAssignee, canDelete, plain }: Props) {
  const status = completion?.status;
  const done = status === "approved";
  const kidTask = assignee?.role === "child";
  const isParent = me.role === "parent";
  const mine = task.assignee === me.id || (!task.assignee && !isParent);
  const sub = plain
    ? null
    : [task.area, task.due_date ? `senast ${formatDate(task.due_date)}` : recurrenceLabel[task.recurrence]].filter(Boolean).join(" · ");

  let mark;
  if (status === "pending") {
    mark = <span className={`${circle} border-dashed border-wait`} aria-label={`${task.title} väntar på godkännande`} role="img" />;
  } else if (!isParent && mine && !done && task.requires_photo) {
    // Barnet: foto krävs
    mark = <PhotoSubmit taskId={task.id} recurrence={task.recurrence} familyId={me.family_id} title={task.title} redo={status === "redo"} />;
  } else if (!isParent && mine && !done) {
    // Barnet: skicka in utan foto
    mark = (
      <form action={submitCompletion}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="recurrence" value={task.recurrence} />
        <button aria-label={`Klar med ${task.title}`} className={`${circle} border-line active:scale-90`} />
      </form>
    );
  } else {
    // Vuxna bockar av direkt. Barn kan inte ångra något som redan är godkänt.
    const can = isParent ? mine || kidTask || !task.assignee : false;
    mark = (
      <form action={toggleTask}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="recurrence" value={task.recurrence} />
        <input type="hidden" name="done" value={String(done)} />
        <button
          disabled={!can}
          aria-label={done ? `Ångra ${task.title}` : `Bocka av ${task.title}`}
          className={`${circle} ${done ? "border-accent bg-accent text-accent-ink" : "border-line"} ${can ? "active:scale-90" : done ? "" : "opacity-35"}`}
        >
          {done && <Tick />}
        </button>
      </form>
    );
  }

  return (
    <div className="flex min-h-14 items-center gap-3 py-3">
      {mark}
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
        {(sub || status === "redo") && (
          <p className="text-[13px] text-muted">
            {sub}
            {status === "redo" && completion?.note && <span className="text-warn">{sub ? " · " : ""}{completion.note}</span>}
          </p>
        )}
      </div>
      {status === "pending" ? (
        <span className="rounded-full bg-wait-soft px-2 py-0.5 text-xs font-semibold text-wait">Väntar</span>
      ) : status === "redo" ? (
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Gör om</span>
      ) : kidTask && task.points > 0 ? (
        <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums text-muted">
          {task.requires_photo && <Camera size={14} aria-label="Kräver foto" />}
          {task.points} p
        </span>
      ) : null}
      {showAssignee && assignee && <Avatar name={assignee.display_name} color={assignee.color} size={22} />}
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
