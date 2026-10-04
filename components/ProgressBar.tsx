type Props = {
  ratio: number;
  label?: string;
  detail?: string;
  over?: boolean;
  thin?: boolean;
};

export function ProgressBar({ ratio, label, detail, over, thin }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div>
      {(label || detail) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="min-w-0 font-medium">{label}</span>
          <span className={`shrink-0 text-sm tabular-nums ${over ? "text-warn" : "text-muted"}`}>{detail ?? `${pct}%`}</span>
        </div>
      )}
      <div
        className={`${thin ? "h-1" : "h-1.5"} w-full overflow-hidden rounded-full bg-track`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${over ? "bg-warn" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
