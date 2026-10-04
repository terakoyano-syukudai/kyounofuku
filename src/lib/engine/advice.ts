// 「今日の結論」の見出しと、時間帯ごとの調整アドバイスを作る
import { PERIOD_META, colorById, subCategoryById, type Period } from "../constants";
import type { WardrobeItem } from "../types";
import type { DayContext, SlotContext } from "./context";
import type { Outfit } from "./outfit";

/** 例:「ネイビーのカーディガン」 */
export const itemLabel = (i: WardrobeItem) => `${colorById(i.color).label}の${subCategoryById(i.subCategory)?.label ?? "アイテム"}`;
const shortLabel = (i: WardrobeItem) => `${colorById(i.color).label}${subCategoryById(i.subCategory)?.label ?? ""}`;

export type SlotAdvice = {
  period: Period;
  label: string;
  emoji: string;
  sceneLabel: string | null;
  sceneEmoji: string | null;
  temp: number;
  feels: number;
  precipProb: number;
  weatherCode: number;
  layer: "outer_on" | "outer_off" | "top_only" | "cold";
  tips: string[];
};

function layerState(slot: SlotContext, o: Outfit): SlotAdvice["layer"] {
  const topW = o.top?.warmth ?? 0;
  if (topW >= slot.required) return o.outer ? "outer_off" : "top_only";
  if (o.outer && topW + o.outer.warmth >= slot.required) return "outer_on";
  return "cold";
}

export function buildSlotAdvice(ctx: DayContext, o: Outfit): SlotAdvice[] {
  let rainMentioned = false;
  let humidMentioned = false;
  let prevLayer: SlotAdvice["layer"] | null = null;
  let prevFeels: number | null = null;

  return ctx.slots.map((slot) => {
    const tips: string[] = [];
    const layer = o.top ? layerState(slot, o) : "top_only";
    const outerName = o.outer ? shortLabel(o.outer) : "羽織り";
    const scene = slot.scene;
    const hasPlan = !!scene;

    // 気温の変化と重ね着
    if (prevFeels != null && prevFeels - slot.feels >= 3) tips.push(`前の時間帯より体感で${Math.round(prevFeels - slot.feels)}℃下がります`);
    if (layer === "outer_on" && prevLayer !== "outer_on") tips.push(`${outerName}を着ておくと快適`);
    if (layer === "outer_off" && (prevLayer === "outer_on" || prevLayer == null)) tips.push(`${outerName}は脱いでバッグへ。トップス1枚でちょうどいい気温`);
    if (layer === "cold" && o.top) tips.push(o.outer ? `${outerName}だけでは少し寒い。インナーを1枚足すと安心` : "手持ちの服だけだと肌寒い時間帯。羽織りを持って出るのがおすすめ");

    // 雨・湿度
    if (slot.weather.precipProb >= 50 && !rainMentioned && hasPlan) {
      tips.push(`降水確率${slot.weather.precipProb}%。折りたたみ傘を忘れずに`);
      rainMentioned = true;
    }
    if (slot.weather.humidity >= 75 && slot.feels >= 22 && hasPlan && !humidMentioned) {
      tips.push(`湿度${slot.weather.humidity}%で蒸し暑め。汗対策にハンカチを`);
      humidMentioned = true;
    }

    // シーンごとの注意点
    if (scene) {
      if (scene.id === "band") tips.push("スタジオは暑くて汗をかく。替えのTシャツを1枚バッグに入れておくと安心");
      else if (scene.id === "gym") tips.push("運動着とタオルを持参");
      else if (scene.id === "parttime_food") tips.push(o.outer ? `匂いや汚れがつきやすいので、${outerName}はロッカーへ` : "匂いや汚れがつきやすいので、お気に入りの服は避けてもOK");
      else if (scene.activity >= 70) tips.push("よく動くので袖をまくれるトップスが快適");
      if (scene.indoor && slot.feels >= 25 && scene.id === "university") tips.push("教室は冷房が強めなこともあるので羽織りがあると安心");
      if (o.top && scene.formality >= o.formality + 15) {
        const tip =
          o.top && ["shirt", "blouse", "knit"].includes(o.top.subCategory)
            ? "きちんとした場面。トップスの裾をタックインするときれいめ度が上がります"
            : "カジュアル寄りのコーデなので、襟つきの服かジャケットがあると安心";
        tips.push(tip);
      }
      if (scene.notes && tips.length === 0) tips.push(scene.notes);
    }
    if (!hasPlan && tips.length === 0) tips.push("予定なし");

    prevLayer = layer;
    prevFeels = slot.feels;
    return {
      period: slot.period,
      label: PERIOD_META[slot.period].label,
      emoji: PERIOD_META[slot.period].emoji,
      sceneLabel: scene?.label ?? null,
      sceneEmoji: scene?.emoji ?? null,
      temp: slot.weather.temp,
      feels: slot.feels,
      precipProb: slot.weather.precipProb,
      weatherCode: slot.weather.code,
      layer,
      tips,
    };
  });
}

/** 例:「白Tシャツ × 黒スラックス、朝晩はネイビーカーディガン」 */
export function buildHeadline(o: Outfit, advice: SlotAdvice[]): string {
  const main = [o.top, o.bottom].filter((x): x is WardrobeItem => !!x).map(shortLabel).join(" × ") || "服を登録してください";
  if (!o.outer) return main;
  const need = advice.filter((a) => a.layer === "outer_on" && a.sceneLabel).map((a) => a.label);
  const allActive = advice.filter((a) => a.sceneLabel);
  if (need.length === 0) return `${main}、念のため${shortLabel(o.outer)}`;
  if (need.length === allActive.length) return `${shortLabel(o.outer)} + ${main}`;
  const when = need.length === 2 && need.includes("朝") && need.includes("夜") ? "朝晩" : need.join("・");
  return `${main}、${when}は${shortLabel(o.outer)}`;
}

export type Reason = { icon: string; title: string; text: string };

/** 「なぜこのコーデ？」の説明（気温・予定・動き・雨・配色の観点で） */
export function explainOutfit(ctx: DayContext, o: Outfit): Reason[] {
  const out: Reason[] = [];
  if (!o.top) return out;
  const outer = o.outer ? shortLabel(o.outer) : null;
  const needOuter = ctx.reqAtColdest > o.top.warmth;
  out.push({
    icon: "🌡️",
    title: "気温",
    text: `体感は最高${Math.round(ctx.feelsMax)}°・最低${Math.round(ctx.feelsMin)}°。${
      outer ? (needOuter ? `寒い時間帯は${outer}を羽織って調整します。` : `日中はトップス1枚、念のため${outer}を。`) : "1日トップス1枚で過ごせる気温です。"
    }`,
  });
  const scenes = ctx.active.map((s) => s.scene).filter((s): s is NonNullable<typeof s> => !!s);
  const formal = [...scenes].sort((a, b) => b.formality - a.formality)[0];
  if (formal) {
    out.push({
      icon: "🎯",
      title: "予定",
      text:
        formal.formality >= 50
          ? `いちばんきちんとした予定「${formal.label}」に合わせて、きれいめ寄りにしました。`
          : `予定はカジュアル中心（${[...new Set(scenes.map((s) => s.label))].join("・")}）なので、気楽な服装にしました。`,
    });
  }
  const active = [...scenes].sort((a, b) => b.activity - a.activity)[0];
  if (active && active.activity >= 70) out.push({ icon: "🏃", title: "動き", text: `「${active.label}」でよく動くので、動きやすい服と靴を優先しました。` });
  if (ctx.rainProb >= 50) {
    const rainOk = o.shoes && subCategoryById(o.shoes.subCategory)?.rainOk;
    out.push({ icon: "☔", title: "雨", text: `降水確率${ctx.rainProb}%。${rainOk ? "雨に強い靴を選びました。" : "手持ちに雨向きの靴がないため、濡れても困らない靴がおすすめです。"}` });
  }
  if (ctx.hotHumid) out.push({ icon: "💧", title: "湿度", text: "蒸し暑いので、通気性のいい素材を優先しました。" });
  const harmony = o.reasons.find((r) => r.includes("配色"));
  if (harmony) out.push({ icon: "🎨", title: "配色", text: `${harmony}です。` });
  return out;
}
