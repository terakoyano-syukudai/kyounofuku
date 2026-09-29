"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PERIODS, PERIOD_META, type Period } from "@/lib/constants";
import { TIMELINE_PRESETS } from "@/lib/db/seed-data";
import { saveDayPlan } from "@/lib/store";
import type { DayPlan, Scene } from "@/lib/types";
import { Button, Chip } from "../ui";

export function TimelineEditor({
  scenes,
  initial,
  dates,
}: {
  scenes: Scene[];
  initial: DayPlan;
  dates: { today: string; tomorrow: string };
}) {
  const [date, setDate] = useState(initial.date);
  const [slots, setSlots] = useState(initial.slots);
  const [picking, setPicking] = useState<Period | null>(null);
  const router = useRouter();
  const sceneMap = new Map(scenes.map((s) => [s.id, s]));

  const applyPreset = (id: string) => {
    const p = TIMELINE_PRESETS.find((x) => x.id === id)!;
    setSlots({ MORNING: p.slots.MORNING ?? null, NOON: p.slots.NOON ?? null, EVENING: p.slots.EVENING ?? null, NIGHT: p.slots.NIGHT ?? null });
  };
  const presetActive = (id: string) => {
    const p = TIMELINE_PRESETS.find((x) => x.id === id)!;
    return PERIODS.every((k) => (p.slots[k] ?? null) === slots[k]);
  };

  return (
    <div>
      <h1 className="px-1 text-2xl font-black">1日の予定</h1>
      <div className="mt-3 flex gap-1 rounded-full bg-surface p-1 text-sm font-bold">
        {[
          { d: dates.today, label: "今日" },
          { d: dates.tomorrow, label: "明日" },
        ].map((x) => (
          <button
            key={x.d}
            type="button"
            onClick={() => setDate(x.d)}
            className={`flex-1 rounded-full py-2 ${date === x.d ? "bg-ink text-bg" : "text-muted"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-5 px-1 text-sm font-bold text-muted">ワンタップで入力</div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {TIMELINE_PRESETS.map((p) => (
          <Chip key={p.id} active={presetActive(p.id)} onClick={() => applyPreset(p.id)}>
            {p.label}
          </Chip>
        ))}
      </div>

      <div className="mt-5 px-1 text-sm font-bold text-muted">時間帯ごとに調整</div>
      <ol className="mt-2 space-y-2">
        {PERIODS.map((p) => {
          const scene = slots[p] ? sceneMap.get(slots[p]!) : null;
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => setPicking(p)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-lg">{PERIOD_META[p].emoji}</span>
                <span className="flex-1">
                  <span className="block text-xs text-muted">
                    {PERIOD_META[p].label}（{PERIOD_META[p].hours[0]}〜{PERIOD_META[p].hours[1]}時）
                  </span>
                  <span className="block text-base font-bold">{scene ? `${scene.emoji} ${scene.label}` : "予定なし"}</span>
                </span>
                <span className="text-muted">›</span>
              </button>
            </li>
          );
        })}
      </ol>

      <Button
        className="mt-6 w-full"
        onClick={() => {
          saveDayPlan({ date, slots });
          router.push(`/?date=${date}`);
        }}
      >
        この予定でコーデを見る
      </Button>

      {picking && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setPicking(null)}>
          <div
            className="mx-auto w-full max-w-md rounded-t-3xl bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`${PERIOD_META[picking].label}の予定を選ぶ`}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="mb-3 text-base font-bold">
              {PERIOD_META[picking].emoji} {PERIOD_META[picking].label}の予定
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[null, ...scenes].map((sc) => (
                <button
                  key={sc?.id ?? "none"}
                  type="button"
                  onClick={() => {
                    setSlots((prev) => ({ ...prev, [picking]: sc?.id ?? null }));
                    setPicking(null);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs ${
                    (slots[picking] ?? null) === (sc?.id ?? null) ? "border-accent bg-accent/10 font-bold" : "border-line bg-surface"
                  }`}
                >
                  <span className="text-2xl">{sc?.emoji ?? "—"}</span>
                  {sc?.label ?? "予定なし"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
