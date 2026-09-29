// AI の読み取り結果と、ユーザーが確認・修正して確定した内容を項目ごとに比べる
import { careById, CATEGORY_LABEL, subCategoryById, type Category } from "../constants";

/** 比較に使う AI 側の値。null は「その方式では判定しない」（例: OCR はカテゴリを推定しない）→ 集計から除外 */
export type AiFields = {
  brand: string;
  category: Category | null;
  sub_category: string | null;
  size: string;
  materials: { name: string; pct: number }[];
  care_symbols: string[];
};

export const FIELDS = [
  { id: "brand", label: "ブランド" },
  { id: "category", label: "カテゴリ" },
  { id: "sub_category", label: "アイテム種別" },
  { id: "size", label: "サイズ" },
  { id: "materials", label: "素材・混率" },
  { id: "care_symbols", label: "洗濯表示" },
] as const;
export type FieldId = (typeof FIELDS)[number]["id"];

export type Truth = {
  brandName: string | null;
  category: Category;
  subCategory: string;
  size: string | null;
  materials: { name: string; pct: number }[];
  careSymbols: string[];
};

export type FieldResult = { match: boolean; ai: string; truth: string; skipped?: boolean };
/** 判定対象なのに外れた項目 */
export const isMiss = (r: FieldResult) => !r.skipped && !r.match;
export type Comparison = {
  fields: Record<FieldId, FieldResult>;
  care: { precision: number; recall: number };
};

const normText = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[\s・.'’\-_&／/]/g, "");

// 素材名の表記ゆれ
const MATERIAL_ALIASES: Record<string, string> = {
  コットン: "綿",
  cotton: "綿",
  麻: "リネン",
  linen: "リネン",
  羊毛: "ウール",
  wool: "ウール",
  polyester: "ポリエステル",
  nylon: "ナイロン",
  スパンデックス: "ポリウレタン",
  エラスタン: "ポリウレタン",
  polyurethane: "ポリウレタン",
  rayon: "レーヨン",
  ビスコース: "レーヨン",
  acrylic: "アクリル",
};
const normMaterial = (name: string) => {
  const n = normText(name);
  return MATERIAL_ALIASES[n] ?? n;
};

const materialsText = (ms: { name: string; pct: number }[]) => ms.map((m) => `${m.name}${m.pct}%`).join(" ") || "—";

function sameMaterials(a: { name: string; pct: number }[], b: { name: string; pct: number }[]) {
  const key = (ms: { name: string; pct: number }[]) => new Map(ms.filter((m) => m.name.trim()).map((m) => [normMaterial(m.name), m.pct]));
  const ka = key(a),
    kb = key(b);
  if (ka.size !== kb.size) return false;
  for (const [name, pct] of ka) {
    const other = kb.get(name);
    if (other == null || Math.abs(other - pct) > 2) return false;
  }
  return true;
}

export function compareAnalysis(ai: AiFields, truth: Truth, sameBrand: (a: string, b: string) => boolean): Comparison {
  const aiCare = new Set(ai.care_symbols);
  const truthCare = new Set(truth.careSymbols);
  const hit = [...aiCare].filter((c) => truthCare.has(c)).length;
  const careLabel = (ids: string[]) => ids.map((c) => careById(c)?.label ?? c).join("・") || "—";

  const aiBrand = ai.brand.trim();
  const truthBrand = (truth.brandName ?? "").trim();

  return {
    fields: {
      brand: {
        match: (!aiBrand && !truthBrand) || (!!aiBrand && !!truthBrand && sameBrand(aiBrand, truthBrand)),
        ai: aiBrand || "—",
        truth: truthBrand || "—",
      },
      category: {
        match: ai.category === truth.category,
        skipped: ai.category == null,
        ai: ai.category ? CATEGORY_LABEL[ai.category] : "—",
        truth: CATEGORY_LABEL[truth.category],
      },
      sub_category: {
        match: ai.sub_category === truth.subCategory,
        skipped: ai.sub_category == null,
        ai: ai.sub_category ? (subCategoryById(ai.sub_category)?.label ?? ai.sub_category) : "—",
        truth: subCategoryById(truth.subCategory)?.label ?? truth.subCategory,
      },
      size: { match: normText(ai.size) === normText(truth.size), ai: ai.size || "—", truth: truth.size || "—" },
      materials: { match: sameMaterials(ai.materials, truth.materials), ai: materialsText(ai.materials), truth: materialsText(truth.materials) },
      care_symbols: {
        match: aiCare.size === truthCare.size && hit === aiCare.size,
        ai: careLabel([...aiCare]),
        truth: careLabel([...truthCare]),
      },
    },
    care: {
      precision: aiCare.size ? hit / aiCare.size : truthCare.size ? 0 : 1,
      recall: truthCare.size ? hit / truthCare.size : 1,
    },
  };
}

export type AccuracySummary = {
  n: number;
  byField: Record<FieldId, { rate: number; n: number }>; // rate: 0〜1、n: 集計対象の件数
  allCorrect: number; // 全項目が正解だった割合
  careF1: number;
};

export function summarize(results: Comparison[]): AccuracySummary {
  const n = results.length;
  const byField = Object.fromEntries(
    FIELDS.map((f) => {
      const judged = results.filter((r) => !r.fields[f.id].skipped);
      return [f.id, { rate: judged.length ? judged.filter((r) => r.fields[f.id].match).length / judged.length : 0, n: judged.length }];
    }),
  ) as AccuracySummary["byField"];
  const f1s = results.map(({ care: { precision: p, recall: r } }) => (p + r ? (2 * p * r) / (p + r) : 0));
  return {
    n,
    byField,
    allCorrect: n ? results.filter((r) => FIELDS.every((f) => r.fields[f.id].skipped || r.fields[f.id].match)).length / n : 0,
    careF1: n ? f1s.reduce((a, b) => a + b, 0) / n : 0,
  };
}
