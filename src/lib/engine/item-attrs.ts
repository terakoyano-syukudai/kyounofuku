// 素材とサブカテゴリから保温性・通気性・フォーマル度を推定する
import { subCategoryById } from "../constants";

export type Material = { name: string; pct: number };

const WARM_MATERIALS = ["ウール", "wool", "カシミヤ", "cashmere", "アクリル", "acrylic", "フリース", "ダウン", "down", "フェザー", "モヘア", "アルパカ"];
const COOL_MATERIALS = ["リネン", "麻", "linen", "レーヨン", "rayon", "キュプラ", "cupro", "メッシュ", "テンセル", "リヨセル"];
const BREATHABLE = ["綿", "コットン", "cotton", "リネン", "麻", "linen", "レーヨン", "キュプラ", "シルク", "テンセル", "リヨセル"];
const SYNTHETIC = ["ポリエステル", "polyester", "ナイロン", "nylon", "ポリウレタン", "アクリル", "合成皮革"];

const share = (materials: Material[], keys: string[]) =>
  materials.reduce((s, m) => (keys.some((k) => m.name.toLowerCase().includes(k.toLowerCase())) ? s + m.pct : s), 0) / 100;

export function deriveItemAttrs(subCategory: string, materials: Material[]) {
  const sub = subCategoryById(subCategory);
  let warmth = sub?.warmth ?? 2;
  const warm = share(materials, WARM_MATERIALS);
  const cool = share(materials, COOL_MATERIALS);
  if (warm >= 0.5) warmth += 1;
  if (cool >= 0.5) warmth -= 1;
  warmth = Math.max(0, Math.min(5, warmth));

  const breath = share(materials, BREATHABLE) - share(materials, SYNTHETIC) * 0.5 - warm * 0.5;
  const breathability = Math.max(1, Math.min(5, Math.round(3 + breath * 2)));

  return { warmth, formality: sub?.formality ?? 40, breathability };
}
