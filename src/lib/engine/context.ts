// 天気 × タイムライン × 体質 から「今日の条件」を組み立てる
import { PERIODS, type Period } from "../constants";
import type { DayPlan, Scene, UserProfile } from "../types";
import type { DayWeather, PeriodWeather } from "../weather";

export type SlotContext = {
  period: Period;
  scene: Scene | null;
  weather: PeriodWeather;
  feels: number; // 体質補正込みの体感温度
  required: number; // 必要な保温レベル
};

export type DayContext = {
  slots: SlotContext[]; // 4 時間帯すべて（予定なしも含む）
  active: SlotContext[]; // 予定のある時間帯（なければ全時間帯）
  feelsMax: number;
  feelsMin: number;
  reqAtWarmest: number;
  reqAtColdest: number;
  targetFormality: number;
  minFormality: number;
  maxActivity: number;
  rainProb: number;
  hotHumid: boolean;
};

/** 寒がり(100)なら体感 -2℃、暑がり(0)なら +2℃ */
export const feelsLike = (apparent: number, heatSensitivity: number) => apparent - (heatSensitivity - 50) / 25;

/** 体感温度 → 必要な保温レベル（トップス+羽織りの warmth 合計の目安） */
export function requiredWarmth(feels: number): number {
  if (feels >= 26) return 1;
  if (feels >= 21) return 2;
  if (feels >= 17) return 3;
  if (feels >= 13) return 4;
  if (feels >= 9) return 5;
  if (feels >= 5) return 6;
  return 7;
}

export function buildContext(user: UserProfile, plan: DayPlan, weather: DayWeather, scenes: Scene[]): DayContext {
  const sceneMap = new Map(scenes.map((s) => [s.id, s]));
  const slots: SlotContext[] = PERIODS.map((p) => {
    const w = weather.periods[p];
    const feels = Math.round(feelsLike(w.apparent, user.body.heatSensitivity) * 10) / 10;
    return {
      period: p,
      scene: plan.slots[p] ? (sceneMap.get(plan.slots[p]!) ?? null) : null,
      weather: w,
      feels,
      required: requiredWarmth(feels),
    };
  });
  const withScene = slots.filter((s) => s.scene && s.scene.id !== "home");
  const active = withScene.length ? withScene : slots;

  const feelsMax = Math.max(...active.map((s) => s.feels));
  const feelsMin = Math.min(...active.map((s) => s.feels));
  const formalities = withScene.map((s) => s.scene!.formality);
  const sceneMax = formalities.length ? Math.max(...formalities) : user.style.formality;
  const sceneAvg = formalities.length ? formalities.reduce((a, b) => a + b, 0) / formalities.length : user.style.formality;

  return {
    slots,
    active,
    feelsMax,
    feelsMin,
    reqAtWarmest: requiredWarmth(feelsMax),
    reqAtColdest: requiredWarmth(feelsMin),
    // いちばんきちんとした場面に合わせつつ、本人の好みに寄せる
    targetFormality: Math.round(Math.max(sceneMax * 0.8, sceneAvg * 0.5 + user.style.formality * 0.5)),
    minFormality: Math.max(0, sceneMax - 25),
    maxActivity: withScene.length ? Math.max(...withScene.map((s) => s.scene!.activity)) : 30,
    rainProb: Math.max(...active.map((s) => s.weather.precipProb)),
    hotHumid: active.some((s) => s.weather.humidity >= 75 && s.feels >= 22),
  };
}
