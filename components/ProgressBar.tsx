type Props = {
  ratio: number;
  label?: string;
  detail?: string;
  color?: string;
  size?: "sm" | "md";
};

export function ProgressBar({ ratio, label, detail, color, size = "md" }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div>
      {(label || detail) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate font-medium">{label}</span>
          <span className="shrink-0 tabular-nums text-muted">{detail ?? `${pct}%`}</span>
        </div>
      )}
      <div
        className={`${size === "sm" ? "h-2" : "h-3"} w-full overflow-hidden rounded-full bg-track`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }}
        />
      </div>
    </div>
  );
}
