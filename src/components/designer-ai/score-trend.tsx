import { formatDate } from "@/lib/format";

/** Line chart of overall scores over time, with band thresholds as faint guides. */
export function ScoreTrend({ points }: { points: { score: number; date: string }[] }) {
  const W = 640, H = 200, L = 36, R = 16, T = 14, B = 30;
  const n = points.length;
  const x = (i: number) => (n === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (s: number) => T + ((100 - s) * (H - T - B)) / 100;
  const guides = [
    { v: 85, label: "85" },
    { v: 70, label: "70" },
    { v: 50, label: "50" },
  ];
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const showLabel = (i: number) => n <= 6 || i === 0 || i === n - 1 || i % Math.ceil(n / 5) === 0;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Score trend: ${points.map((p) => p.score).join(", ")}`}>
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="stroke-paper-200" strokeWidth={1} />
        {guides.map((g) => (
          <g key={g.v}>
            <line x1={L} x2={W - R} y1={y(g.v)} y2={y(g.v)} className="stroke-paper-200" strokeWidth={1} strokeDasharray="3 4" />
            <text x={L - 8} y={y(g.v) + 4} textAnchor="end" className="fill-ink-400 text-[11px] tabular">{g.label}</text>
          </g>
        ))}
        {n > 1 && <path d={d} fill="none" className="stroke-ink-900" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => {
          const last = i === n - 1;
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.score)} r={14} fill="transparent">
                <title>{`${p.score} · ${formatDate(p.date)}`}</title>
              </circle>
              <circle cx={x(i)} cy={y(p.score)} r={last ? 6 : 4.5} className={last ? "fill-marigold-500 stroke-paper-0" : "fill-ink-900 stroke-paper-0"} strokeWidth={2} pointerEvents="none" />
              {(last || n <= 6) && (
                <text x={x(i)} y={y(p.score) - 12} textAnchor="middle" className={last ? "fill-ink-900 text-[12px] font-semibold tabular" : "fill-ink-500 text-[11px] tabular"}>{p.score}</text>
              )}
              {showLabel(i) && (
                <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-500 text-[11px]">
                  {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">Dashed lines mark the band thresholds: 50 Developing, 70 Strong, 85 Exceptional.</figcaption>
    </figure>
  );
}
