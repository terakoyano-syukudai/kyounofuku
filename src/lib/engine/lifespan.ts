// 買い替え時期の目安: 着た回数と購入からの年数の両方で判断する（どちらか近い方を採用）
import { subCategoryById } from "../constants";
import type { WardrobeItem } from "../types";

// サブカテゴリごとの目安（着用回数, 年数）。一般的な使い方を想定したおおよその値
const LIFESPAN: Record<string, { wears: number; years: number }> = {
  tshirt: { wears: 50, years: 2 },
  longsleeve: { wears: 60, years: 2 },
  polo: { wears: 60, years: 3 },
  shirt: { wears: 80, years: 3 },
  blouse: { wears: 70, years: 3 },
  knit: { wears: 70, years: 4 },
  sweat: { wears: 100, years: 3 },
  hoodie: { wears: 100, years: 3 },
  denim: { wears: 200, years: 6 },
  chino: { wears: 120, years: 4 },
  slacks: { wears: 120, years: 4 },
  wide: { wears: 100, years: 4 },
  cargo: { wears: 150, years: 5 },
  shorts: { wears: 80, years: 3 },
  skirt: { wears: 100, years: 4 },
  cardigan: { wears: 80, years: 4 },
  shirt_jacket: { wears: 120, years: 5 },
  denim_jacket: { wears: 300, years: 10 },
  tailored: { wears: 150, years: 5 },
  blouson: { wears: 150, years: 5 },
  mountain_parka: { wears: 200, years: 6 },
  coat: { wears: 200, years: 7 },
  down: { wears: 150, years: 6 },
  sneakers: { wears: 250, years: 2.5 },
  canvas: { wears: 150, years: 2 },
  leather: { wears: 400, years: 6 },
  loafer: { wears: 300, years: 5 },
  boots: { wears: 400, years: 6 },
  rain_shoes: { wears: 200, years: 3 },
  sandals: { wears: 100, years: 2 },
  tote: { wears: 400, years: 4 },
  backpack: { wears: 500, years: 5 },
  shoulder: { wears: 400, years: 5 },
  cap: { wears: 200, years: 3 },
  scarf: { wears: 150, years: 5 },
};

const share = (item: WardrobeItem, re: RegExp) => item.materials.reduce((s, m) => (re.test(m.name) ? s + m.pct : s), 0) / 100;

/** 素材で目安回数を調整（化繊は丈夫、麻・レーヨンは傷みやすい、ウールは毛玉が出やすい） */
export function expectedLife(item: WardrobeItem) {
  const base = LIFESPAN[item.subCategory] ?? { wears: 100, years: 3 };
  let k = 1;
  if (share(item, /ポリエステル|ナイロン/) >= 0.5) k = 1.2;
  else if (share(item, /リネン|麻|レーヨン/) >= 0.5) k = 0.8;
  else if (share(item, /ウール|毛|カシミヤ|アクリル/) >= 0.5) k = 0.9;
  return { wears: Math.round(base.wears * k), years: base.years };
}

export type LifeStatus = "ok" | "soon" | "replace";

export type LifeInfo = {
  wearCount: number;
  ageYears: number | null;
  expected: { wears: number; years: number };
  wearRatio: number;
  ageRatio: number | null;
  used: number; // 0〜（1 で目安に到達）
  status: LifeStatus;
  reason: string; // どちらの基準で判断したか
};

/** 指定日までの年数（小数） */
const yearsBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / (365.25 * 86400000);

export function lifeInfo(item: WardrobeItem, wearCount: number, today: string): LifeInfo {
  const expected = expectedLife(item);
  const ageYears = item.purchasedAt ? Math.max(0, yearsBetween(item.purchasedAt, today)) : null;
  const wearRatio = wearCount / expected.wears;
  const ageRatio = ageYears == null ? null : ageYears / expected.years;
  const used = Math.max(wearRatio, ageRatio ?? 0);
  const status: LifeStatus = used >= 1 ? "replace" : used >= 0.8 ? "soon" : "ok";
  const label = subCategoryById(item.subCategory)?.label ?? "この服";
  const byAge = ageRatio != null && ageRatio >= wearRatio;
  const reason = byAge
    ? `購入から約${ageYears! < 0.95 ? `${Math.max(1, Math.round(ageYears! * 12))}か月` : `${Math.round(ageYears! * 10) / 10}年`}（${label}の目安 ${expected.years}年）`
    : `${wearCount}回着用（${label}の目安 ${expected.wears}回）`;
  return { wearCount, ageYears, expected, wearRatio, ageRatio, used, status, reason };
}

export const LIFE_STATUS_LABEL: Record<LifeStatus, string> = {
  ok: "まだ大丈夫",
  soon: "そろそろ買い替え",
  replace: "買い替え時期",
};
