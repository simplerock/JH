import Link from "next/link";
import { levelFor } from "@/lib/progress";
import type { RewardLevel } from "@/lib/types";

/** Barnets veckopoäng med nivå, stege och vad som krävs till nästa nivå. */
export function ScoreCard({ points, pendingPoints, levels, daysLeft }: { points: number; pendingPoints: number; levels: RewardLevel[]; daysLeft: number }) {
  const { level, next, lowest, rank, total } = levelFor(points, levels);
  return (
    <Link href="/poang" className="block rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[44px] font-extrabold leading-none tracking-tight tabular-nums">{points}</span>
        {level && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lowest ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"}`}>{level.name}</span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        poäng den här veckan{pendingPoints > 0 && ` · ${pendingPoints} väntar på godkännande`}
      </p>
      {total > 0 && (
        <div className="mt-3.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }} aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`h-1.5 rounded-full ${i < rank ? (lowest ? "bg-warn" : "bg-accent") : "bg-track"}`} />
          ))}
        </div>
      )}
      <p className="mt-2.5 text-sm text-muted">
        {next ? `${next.min_points - points} poäng till ${next.name}: ${next.reward.charAt(0).toLowerCase()}${next.reward.slice(1)}.` : level ? `Högsta nivån! ${level.reward}.` : ""}{" "}
        {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"} kvar.` : "Sista dagen."}
      </p>
    </Link>
  );
}
