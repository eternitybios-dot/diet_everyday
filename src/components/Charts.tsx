type SparkProps = {
  values: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  /** false にすると 0 を含めず、値の範囲だけで縦軸を取る（体重など）。 */
  zero?: boolean;
};

export function Sparkline({
  values,
  color = "var(--lime)",
  height = 64,
  fill = true,
  zero = true,
}: SparkProps) {
  const w = 320;
  const h = height;
  const pad = 4;
  if (!values.length) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // 体重は ±0.5kg 程度の幅を確保して、平坦でも線が読めるようにする
  const slack = zero ? 0 : Math.max(0.5, (hi - lo) * 0.15);
  const min = zero ? Math.min(lo, 0) : lo - slack;
  const max = zero ? Math.max(hi, 0) : hi + slack;
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
      {zero ? <line x1={pad} x2={w - pad} y1={zeroY} y2={zeroY} className="spark-zero" /> : null}
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
