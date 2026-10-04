import { FIELDS, type AccuracySummary } from "@/lib/ai/accuracy";

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** 項目ごとの正解率。実数は常にラベルで表示し、色は補助 */
export function AccuracyBars({ summary }: { summary: AccuracySummary }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums">{pct(summary.allCorrect)}</span>
        <span className="text-sm text-muted">判定した項目がすべて修正なしだった割合（{summary.n}件）</span>
      </div>
      <ul className="mt-3 space-y-2">
        {FIELDS.map((f) => {
          const { rate: v, n } = summary.byField[f.id];
          if (n === 0)
            return (
              <li key={f.id} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm text-muted">
                <span>{f.label}</span>
                <span>この方式では判定しません</span>
              </li>
            );
          return (
            <li key={f.id} className="grid grid-cols-[6.5rem_1fr_2.8rem] items-center gap-2 text-sm">
              <span>{f.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span className={`block h-full rounded-full ${v >= 0.9 ? "bg-good" : v >= 0.7 ? "bg-accent" : "bg-warn"}`} style={{ width: pct(v) }} />
              </span>
              <span className="text-right font-bold tabular-nums">{pct(v)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-muted">洗濯表示の F1（部分一致も加味）: {pct(summary.careF1)}</p>
    </div>
  );
}
