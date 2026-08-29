type SparkProps = {
  values: number[];
  color?: string;
  height?: number;
  fill?: boolean;
};

export function Sparkline({ values, color = "var(--lime)", height = 64, fill = true }: SparkProps) {
  const w = 320;
  const h = height;
  const pad = 4;
  if (!values.length) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  const zeroY = h - pad - ((0 - min) / span) * (h - pad * 2);

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <line x1={pad} x2={w - pad} y1={zeroY} y2={zeroY} className="spark-zero" />
      {fill ? <path d={area} fill={color} opacity={0.18} /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type Bar = { label: string; value: number; mark?: boolean };

export function WeekBars({
  bars,
  color = "var(--lime)",
  goal,
}: {
  bars: Bar[];
  color?: string;
  goal?: number;
}) {
  const peak = Math.max(...bars.map((b) => b.value), goal ?? 0, 1);
  return (
    <div className="weekbars">
      {bars.map((b) => (
        <div key={b.label} className="weekbars-col">
          <div className="weekbars-track">
            {goal ? (
              <i className="weekbars-goal" style={{ bottom: `${(goal / peak) * 100}%` }} />
            ) : null}
            <span
              className={b.mark ? "on" : ""}
              style={{
                height: `${Math.max(3, (b.value / peak) * 100)}%`,
                background: color,
                opacity: b.value ? 1 : 0.25,
              }}
            />
          </div>
          <em>{b.label}</em>
        </div>
      ))}
    </div>
  );
}
