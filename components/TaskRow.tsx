import { Camera } from "lucide-react";
import { approveCompletion, deleteTask, releaseTask, submitCompletion, toggleTask, undoCompletion } from "@/app/actions";
import { getI18n } from "@/lib/i18n/server";
import type { Completion, Profile, Task } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ConfirmAction } from "./ConfirmAction";
import { ConfirmDelete } from "./ConfirmDelete";
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

export async function TaskRow({ task, completion, me, assignee, showAssignee, canDelete, plain }: Props) {
  const { t, date, recurrence } = await getI18n();
  const status = completion?.status;
  const done = status === "approved";
  const kidTask = assignee?.role === "child";
  const isParent = me.role === "parent";
  const mine = task.assignee === me.id || (!task.assignee && !isParent);
  const completionId = completion?.id;
  // Barnet kan ångra sitt eget inskick så länge det väntar. Föräldrar kan återställa ett barns syssla
  // i alla lägen (inskickad, gör om, godkänd), så att den blir ogjord igen utan poäng.
  const kidUndo = !isParent && status === "pending" && completion?.completed_by === me.id && !!completionId;
  const parentReset = isParent && kidTask && !!completionId;
  const sub = plain
    ? null
    : [task.area, task.due_date ? t("senast {date}", { date: date(task.due_date) }) : recurrence(task.recurrence)].filter(Boolean).join(" · ");

  let mark;
  if (status === "pending") {
    mark = <span className={`${circle} border-dashed border-wait`} aria-label={t("{title} väntar på godkännande", { title: task.title })} role="img" />;
  } else if (!isParent && mine && !done && task.requires_photo) {
    // Barnet: foto krävs
    mark = <PhotoSubmit taskId={task.id} recurrence={task.recurrence} familyId={me.family_id} title={task.title} redo={status === "redo"} />;
  } else if (!isParent && mine && !done) {
    // Barnet: skicka in utan foto
    mark = (
      <form action={submitCompletion}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="recurrence" value={task.recurrence} />
        <button aria-label={t("Klar med {title}", { title: task.title })} className={`${circle} border-line active:scale-90`} />
      </form>
    );
  } else if (parentReset && status === "redo") {
    // Föräldern godkänner ändå, till exempel om "Gör om" blev fel.
    mark = (
      <form action={approveCompletion}>
        <input type="hidden" name="id" value={completionId} />
        <button aria-label={t("Godkänn {title}", { title: task.title })} className={`${circle} border-line active:scale-90`} />
      </form>
    );
  } else if (parentReset && done) {
    // Ett barns godkända syssla tas inte bort med ett tryck på cirkeln. Det görs med Återställ, i två steg.
    mark = (
      <span role="img" aria-label={t("{title} är godkänd", { title: task.title })} className={`${circle} border-accent bg-accent text-accent-ink`}>
        <Tick />
      </span>
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
          aria-label={done ? t("Ångra {title}", { title: task.title }) : t("Bocka av {title}", { title: task.title })}
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
        {kidUndo && (
          <form action={undoCompletion} className="mt-1">
            <input type="hidden" name="id" value={completionId} />
            <button className="text-[13px] font-semibold text-accent" aria-label={t("Ångra {title}", { title: task.title })}>
              {t("Ångra")}
            </button>
          </form>
        )}
        {parentReset && completionId && (
          <div className="mt-1">
            <ConfirmAction
              action={undoCompletion}
              id={completionId}
              label={t("Återställ {title}", { title: task.title })}
              confirm={t("Återställ?")}
              className="text-[13px] font-semibold text-muted"
            >
              {t("Återställ")}
            </ConfirmAction>
          </div>
        )}
      </div>
      {status === "pending" ? (
        <span className="rounded-full bg-wait-soft px-2 py-0.5 text-xs font-semibold text-wait">{t("Väntar")}</span>
      ) : status === "redo" ? (
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">{t("Gör om")}</span>
      ) : (kidTask || !task.assignee) && task.points > 0 ? (
        <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums text-muted">
          {task.requires_photo && <Camera size={14} aria-label={t("Kräver foto")} />}
          {task.points} p
        </span>
      ) : null}
      {!isParent && task.claimed_at && task.assignee === me.id && !status && (
        <form action={releaseTask}>
          <input type="hidden" name="id" value={task.id} />
          <button className="text-[13px] font-medium text-muted underline-offset-2 active:underline" aria-label={t("Släpp {title}", { title: task.title })}>{t("Släpp")}</button>
        </form>
      )}
      {showAssignee && assignee && <Avatar name={assignee.display_name} color={assignee.color} size={22} />}
      {canDelete && (
        <ConfirmDelete action={deleteTask} id={task.id} label={t("Ta bort {title}", { title: task.title })} />
      )}
    </div>
  );
}
