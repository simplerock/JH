import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { levelFor, STREAK_BONUS, STREAK_LENGTH } from "@/lib/progress";
import type { KidWeek } from "@/lib/score";
import type { RewardLevel } from "@/lib/types";

/** Barnets veckopoäng med nivå, stege och vad som krävs till nästa nivå. */
export async function ScoreCard({ week, pendingPoints, levels, daysLeft }: { week: KidWeek; pendingPoints: number; levels: RewardLevel[]; daysLeft: number }) {
  const { t } = await getI18n();
  const days = (n: number) => (n === 1 ? t("1 dag") : t("{n} dagar", { n }));
  const { points, streak, bonus, extra } = week;
  const toBonus = STREAK_LENGTH - (streak % STREAK_LENGTH);
  const { level, next, lowest, rank, total } = levelFor(points, levels);
  return (
    <Link href="/poang" className="block rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[44px] font-extrabold leading-none tracking-tight tabular-nums">{points}</span>
        {level && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lowest ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"}`}>{t(level.name)}</span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        {t("poäng den här veckan")}
        {bonus > 0 && ` · ${t("varav {n} bonus", { n: bonus })}`}
        {extra > 0 && ` · ${t("{n} extra", { n: extra })}`}
        {extra < 0 && ` · ${t("{n} avdrag", { n: -extra })}`}
        {pendingPoints > 0 && ` · ${t("{n} p väntar på godkännande", { n: pendingPoints })}`}
      </p>
      {total > 0 && (
        <div className="mt-3.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }} aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`h-1.5 rounded-full ${i < rank ? (lowest ? "bg-warn" : "bg-accent") : "bg-track"}`} />
          ))}
        </div>
      )}
      <p className="mt-2.5 text-sm text-muted">
        {next
          ? t("{n} poäng till {level}: {reward}.", { n: next.min_points - points, level: t(next.name), reward: `${t(next.reward).charAt(0).toLowerCase()}${t(next.reward).slice(1)}` })
          : level
            ? t("Högsta nivån! {reward}.", { reward: t(level.reward) })
            : ""}{" "}
        {daysLeft > 0 ? t("{days} kvar.", { days: days(daysLeft) }) : t("Sista dagen.")}
      </p>
      {streak > 0 && (
        <p className="mt-2 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-wait-soft px-2 py-0.5 text-xs font-semibold text-wait">{t("{days} i rad", { days: days(streak) })}</span>
          <span className="text-muted">
            {streak % STREAK_LENGTH === 0 ? t("Bonus +{n}!", { n: STREAK_BONUS }) : t("{days} till +{n} bonus", { days: days(toBonus), n: STREAK_BONUS })}
          </span>
        </p>
      )}
    </Link>
  );
}
