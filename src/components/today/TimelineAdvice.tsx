import { PERIOD_META } from "@/lib/constants";
import type { SlotAdvice } from "@/lib/engine/advice";
import { weatherLabel } from "@/lib/weather";

const LAYER_BADGE: Record<SlotAdvice["layer"], { text: string; cls: string } | null> = {
  outer_on: { text: "🧥 羽織る", cls: "bg-accent/15 text-accent" },
  outer_off: { text: "👕 脱ぐ", cls: "bg-good/15 text-good" },
  top_only: null,
  cold: { text: "🥶 寒い", cls: "bg-warn/20 text-warn" },
};

/** 時間帯ごとの気温ストリップ */
export function WeatherStrip({ advice }: { advice: SlotAdvice[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {advice.map((a) => {
        const w = weatherLabel(a.weatherCode);
        return (
          <div key={a.period} className={`rounded-2xl border-2 px-1 py-2.5 text-center ${a.sceneLabel ? "border-line bg-surface" : "border-transparent bg-surface/60"}`}>
            <div className="text-sm font-bold">{a.label}</div>
            <div className="text-2xl leading-tight" aria-label={w.label}>
              {w.emoji}
            </div>
            <div className="text-lg font-black tabular-nums">{Math.round(a.temp)}°</div>
            <div className="text-xs tabular-nums text-muted">体感{Math.round(a.feels)}°</div>
            {a.precipProb >= 30 && <div className="text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400">☂{a.precipProb}%</div>}
          </div>
        );
      })}
    </div>
  );
}

export function TimelineAdvice({ advice }: { advice: SlotAdvice[] }) {
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[23px] before:top-4 before:w-0.5 before:bg-line">
      {advice.map((a) => {
        const badge = LAYER_BADGE[a.layer];
        return (
          <li key={a.period} className="relative flex gap-3">
            <div className="z-10 flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border-2 border-line bg-surface text-sm font-black leading-tight">
              {PERIOD_META[a.period].hours[0]}時
            </div>
            <div className={`min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface p-3 ${a.sceneLabel ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-base font-black">{a.label}</span>
                <span className="text-base">{a.sceneLabel ? `${a.sceneEmoji} ${a.sceneLabel}` : "予定なし"}</span>
                <span className="ml-auto text-sm font-bold tabular-nums text-muted">体感{Math.round(a.feels)}°</span>
                {badge && a.sceneLabel && <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${badge.cls}`}>{badge.text}</span>}
              </div>
              {a.sceneLabel && a.tips.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {a.tips.map((t) => (
                    <li key={t} className="flex gap-1.5 text-base leading-relaxed">
                      <span aria-hidden className="text-muted">
                        ・
                      </span>
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
