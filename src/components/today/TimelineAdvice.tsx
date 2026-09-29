import { PERIOD_META } from "@/lib/constants";
import type { SlotAdvice } from "@/lib/engine/advice";
import { weatherLabel } from "@/lib/weather";

const LAYER_BADGE: Record<SlotAdvice["layer"], { text: string; cls: string } | null> = {
  outer_on: { text: "羽織る", cls: "bg-accent/15 text-accent" },
  outer_off: { text: "脱ぐ", cls: "bg-good/15 text-good" },
  top_only: null,
  cold: { text: "寒い", cls: "bg-warn/20 text-warn" },
};

/** 時間帯ごとの気温ストリップ */
export function WeatherStrip({ advice }: { advice: SlotAdvice[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {advice.map((a) => {
        const w = weatherLabel(a.weatherCode);
        return (
          <div key={a.period} className={`rounded-2xl px-2 py-2.5 text-center ${a.sceneLabel ? "bg-surface" : "bg-surface/50 opacity-60"}`}>
            <div className="text-[11px] text-muted">{a.label}</div>
            <div className="text-lg leading-tight" title={w.label}>
              {w.emoji}
            </div>
            <div className="text-base font-bold tabular-nums">{Math.round(a.temp)}°</div>
            <div className="text-[10px] tabular-nums text-muted">体感{Math.round(a.feels)}°</div>
            {a.precipProb >= 30 && <div className="text-[10px] font-bold tabular-nums text-blue-500">☂{a.precipProb}%</div>}
          </div>
        );
      })}
    </div>
  );
}

export function TimelineAdvice({ advice }: { advice: SlotAdvice[] }) {
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-line">
      {advice.map((a) => {
        const badge = LAYER_BADGE[a.layer];
        return (
          <li key={a.period} className="relative flex gap-3">
            <div className="z-10 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-line bg-surface text-[10px] font-bold leading-tight text-muted">
              {PERIOD_META[a.period].hours[0]}時
            </div>
            <div className={`min-w-0 flex-1 rounded-2xl bg-surface p-3 ${a.sceneLabel ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{a.label}</span>
                <span className="truncate text-sm text-muted">{a.sceneLabel ? `${a.sceneEmoji} ${a.sceneLabel}` : "予定なし"}</span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">{Math.round(a.feels)}°</span>
                {badge && a.sceneLabel && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>{badge.text}</span>}
              </div>
              {a.sceneLabel && (
                <ul className="mt-1.5 space-y-1">
                  {a.tips.map((t) => (
                    <li key={t} className="text-[13px] leading-relaxed">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
