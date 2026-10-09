import { approveCompletion, redoCompletion, undoCompletion } from "@/app/actions";
import type { Completion, Profile, Task } from "@/lib/types";
import { getI18n } from "@/lib/i18n/server";
import { ConfirmAction } from "./ConfirmAction";
import { Section } from "./Section";

type Item = { completion: Completion; task: Task; kid?: Profile; photoUrl?: string };

/**
 * Det barnen skickat in. Godkänn ger poäng, Gör om skickar tillbaka med en kommentar,
 * Återställ tar bort inskicket helt (om barnet tryckt på fel syssla).
 */
export async function Approvals({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  const { t, time: at } = await getI18n();
  const time = (iso?: string) => (iso ? at(iso, { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "");
  return (
    <Section title={t("Att godkänna")} aside={String(items.length)}>
      {items.map(({ completion: c, task, kid, photoUrl }) => (
        <div key={c.id} className="py-3.5">
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <a href={photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- signerad länk från Storage */}
                <img src={photoUrl} alt={t("Foto: {title}", { title: task.title })} className="size-14 rounded-xl bg-track object-cover" />
              </a>
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-track text-center text-[11px] text-muted">{t("Inget foto")}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{task.title}</p>
              <p className="text-[13px] text-muted">{[kid?.display_name, time(c.completed_at), `${task.points} p`].filter(Boolean).join(" · ")}</p>
            </div>
            {c.id && (
              <ConfirmAction
                action={undoCompletion}
                id={c.id}
                label={t("Återställ {title}", { title: task.title })}
                confirm={t("Återställ?")}
                className="shrink-0 self-start text-[13px] font-semibold text-muted"
              >
                {t("Återställ")}
              </ConfirmAction>
            )}
          </div>
          <div className="mt-2.5 flex gap-2 pl-[68px]">
            <form action={approveCompletion}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn px-3.5 py-1.5 text-sm">{t("Godkänn")}</button>
            </form>
            <details className="group/redo flex-1">
              <summary className="btn-ghost cursor-pointer list-none px-3.5 py-1.5 text-sm group-open/redo:hidden">{t("Gör om")}</summary>
              <form action={redoCompletion} className="flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input className="input min-w-0 flex-1 py-1.5 text-sm" name="note" placeholder={t("Vad saknas?")} aria-label={t("Vad saknas?")} />
                <button className="btn-ghost shrink-0 px-3 py-1.5 text-sm">{t("Skicka")}</button>
              </form>
            </details>
          </div>
        </div>
      ))}
    </Section>
  );
}
