"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PERIODS, PERIOD_META, type Period } from "@/lib/constants";
import { TIMELINE_PRESETS } from "@/lib/db/seed-data";
import { saveDayPlan } from "@/lib/store";
import type { DayPlan, Scene } from "@/lib/types";
import { toast } from "@/lib/toast";
import { Button, Chip, PageHeader } from "../ui";

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
      <PageHeader title="1日の予定" description="朝・昼・夕・夜の予定を入れると、時間帯ごとの気温差や場面に合わせて服を提案します。" />
      <div className="mt-3 flex gap-1 rounded-full bg-surface p-1 text-sm font-bold">
        {[
          { d: dates.today, label: "今日" },
          { d: dates.tomorrow, label: "明日" },
        ].map((x) => (
          <button
            key={x.d}
            type="button"
            onClick={() => setDate(x.d)}
            className={`min-h-11 flex-1 rounded-full text-base ${date === x.d ? "bg-ink text-bg" : "text-muted"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <h2 className="mt-6 px-1 text-lg font-black">① テンプレートからワンタップで入力</h2>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {TIMELINE_PRESETS.map((p) => (
          <Chip key={p.id} active={presetActive(p.id)} onClick={() => applyPreset(p.id)}>
            {p.label}
          </Chip>
        ))}
      </div>

      <h2 className="mt-6 px-1 text-lg font-black">② 時間帯ごとに調整（タップで変更）</h2>
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
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-xl">{PERIOD_META[p].emoji}</span>
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
          toast("予定を保存しました");
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
