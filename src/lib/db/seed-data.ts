// 初期データ: シーン / ブランドマスタ / 買い足し用の疑似カタログ / サンプル手持ち服
import type { Category, Period } from "../constants";

export type SceneSeed = {
  id: string;
  label: string;
  emoji: string;
  formality: number;
  activity: number;
  indoor: boolean;
  notes?: string;
};

export const SCENES: SceneSeed[] = [
  { id: "university", label: "大学", emoji: "🎓", formality: 30, activity: 40, indoor: true, notes: "教室の冷房・暖房で温度差あり" },
  { id: "office", label: "オフィス", emoji: "🏢", formality: 75, activity: 20, indoor: true, notes: "空調が効いている" },
  { id: "office_casual", label: "オフィスカジュアル", emoji: "💼", formality: 55, activity: 25, indoor: true },
  { id: "parttime_food", label: "バイト(飲食)", emoji: "🍳", formality: 20, activity: 75, indoor: true, notes: "制服に着替える・匂いや汚れがつきやすい" },
  { id: "parttime_retail", label: "バイト(販売)", emoji: "🛍", formality: 50, activity: 55, indoor: true, notes: "立ち仕事" },
  { id: "band", label: "バンド練習", emoji: "🎸", formality: 15, activity: 80, indoor: true, notes: "スタジオは暑く汗をかく・機材を運ぶ" },
  { id: "gym", label: "ジム・運動", emoji: "🏃", formality: 5, activity: 95, indoor: true, notes: "着替えを持参" },
  { id: "date", label: "デート", emoji: "💐", formality: 60, activity: 35, indoor: false },
  { id: "dinner", label: "ディナー・飲み会", emoji: "🍷", formality: 55, activity: 20, indoor: true },
  { id: "cafe", label: "カフェ・作業", emoji: "☕", formality: 35, activity: 10, indoor: true },
  { id: "shopping", label: "買い物・街歩き", emoji: "🚶", formality: 40, activity: 55, indoor: false },
  { id: "outdoor", label: "公園・アウトドア", emoji: "🌳", formality: 15, activity: 70, indoor: false, notes: "日差しと地面の汚れに注意" },
  { id: "interview", label: "面接・式典", emoji: "🎤", formality: 95, activity: 15, indoor: true },
  { id: "home", label: "家・近所", emoji: "🏠", formality: 0, activity: 15, indoor: true },
];

export type TimelinePreset = {
  id: string;
  label: string;
  slots: Partial<Record<Period, string>>;
};

export const TIMELINE_PRESETS: TimelinePreset[] = [
  { id: "uni_work_band", label: "大学→バイト→バンド", slots: { MORNING: "university", NOON: "university", EVENING: "parttime_food", NIGHT: "band" } },
  { id: "uni_only", label: "大学の日", slots: { MORNING: "university", NOON: "university", EVENING: "university", NIGHT: "home" } },
  { id: "office_day", label: "出社→飲み会", slots: { MORNING: "office", NOON: "office", EVENING: "office", NIGHT: "dinner" } },
  { id: "holiday", label: "休日おでかけ", slots: { NOON: "shopping", EVENING: "cafe", NIGHT: "dinner" } },
  { id: "date_day", label: "デート", slots: { NOON: "date", EVENING: "date", NIGHT: "dinner" } },
  { id: "active", label: "アクティブな休日", slots: { MORNING: "outdoor", NOON: "outdoor", EVENING: "shopping", NIGHT: "home" } },
];

export type BrandSeed = {
  name: string;
  aliases: string[];
  tier: number;
  age: string;
  taste: Record<string, number>;
  cats?: Category[]; // 取り扱いカテゴリ（未指定なら全カテゴリ）
};

export const BRANDS: BrandSeed[] = [
  { name: "UNIQLO", aliases: ["ユニクロ"], tier: 1, age: "全年齢", taste: { minimal: 0.9, casual: 0.7, kireime: 0.4 } },
  { name: "GU", aliases: ["ジーユー"], tier: 1, age: "15-29", taste: { casual: 0.8, street: 0.4, kireime: 0.3 } },
  { name: "無印良品", aliases: ["MUJI", "ムジルシ"], tier: 1, age: "20-50", taste: { natural: 0.9, minimal: 0.8 } },
  { name: "ZARA", aliases: ["ザラ"], tier: 2, age: "18-35", taste: { mode: 0.7, kireime: 0.6, street: 0.3 } },
  { name: "H&M", aliases: ["エイチアンドエム", "H & M"], tier: 1, age: "15-30", taste: { casual: 0.7, street: 0.5 } },
  { name: "GLOBAL WORK", aliases: ["グローバルワーク"], tier: 2, age: "20-40", taste: { casual: 0.8, natural: 0.5 } },
  { name: "BEAMS", aliases: ["ビームス"], tier: 3, age: "20-40", taste: { casual: 0.6, kireime: 0.6, vintage: 0.3 } },
  { name: "UNITED ARROWS", aliases: ["ユナイテッドアローズ"], tier: 4, age: "25-45", taste: { kireime: 0.9, minimal: 0.5 } },
  { name: "SHIPS", aliases: ["シップス"], tier: 3, age: "25-45", taste: { kireime: 0.8, casual: 0.4 } },
  { name: "URBAN RESEARCH", aliases: ["アーバンリサーチ"], tier: 3, age: "20-40", taste: { minimal: 0.6, natural: 0.5, kireime: 0.5 } },
  { name: "nano・universe", aliases: ["ナノユニバース", "nano universe"], tier: 3, age: "20-35", taste: { kireime: 0.7, mode: 0.4 } },
  { name: "JOURNAL STANDARD", aliases: ["ジャーナルスタンダード"], tier: 3, age: "20-40", taste: { vintage: 0.5, casual: 0.6, natural: 0.4 } },
  { name: "WEGO", aliases: ["ウィゴー"], tier: 1, age: "15-24", taste: { street: 0.8, casual: 0.6, vintage: 0.3 } },
  { name: "X-LARGE", aliases: ["エクストララージ", "XLARGE"], tier: 3, age: "15-30", taste: { street: 1.0 }, cats: ["TOPS", "BOTTOMS", "OUTER", "BAG"] },
  { name: "Champion", aliases: ["チャンピオン"], tier: 2, age: "15-40", taste: { casual: 0.7, street: 0.6, vintage: 0.4 }, cats: ["TOPS", "BOTTOMS", "OUTER", "BAG"] },
  { name: "Levi's", aliases: ["リーバイス", "LEVIS"], tier: 2, age: "18-50", taste: { casual: 0.7, vintage: 0.7 }, cats: ["TOPS", "BOTTOMS", "OUTER"] },
  { name: "Dickies", aliases: ["ディッキーズ"], tier: 2, age: "15-35", taste: { street: 0.8, casual: 0.5 }, cats: ["TOPS", "BOTTOMS", "OUTER"] },
  { name: "CONVERSE", aliases: ["コンバース"], tier: 2, age: "全年齢", taste: { casual: 0.8, vintage: 0.5, street: 0.4 }, cats: ["SHOES"] },
  { name: "New Balance", aliases: ["ニューバランス", "NB"], tier: 2, age: "20-45", taste: { casual: 0.7, minimal: 0.4, street: 0.4 }, cats: ["SHOES"] },
  { name: "Dr.Martens", aliases: ["ドクターマーチン"], tier: 3, age: "18-40", taste: { mode: 0.6, street: 0.5, vintage: 0.5 }, cats: ["SHOES", "BAG"] },
  { name: "THE NORTH FACE", aliases: ["ザ・ノース・フェイス", "ノースフェイス", "TNF"], tier: 3, age: "18-45", taste: { outdoor: 1.0, street: 0.4 }, cats: ["TOPS", "BOTTOMS", "OUTER", "SHOES", "BAG"] },
  { name: "patagonia", aliases: ["パタゴニア"], tier: 3, age: "20-50", taste: { outdoor: 0.9, natural: 0.5 }, cats: ["TOPS", "BOTTOMS", "OUTER", "BAG"] },
  { name: "AURALEE", aliases: ["オーラリー"], tier: 5, age: "25-45", taste: { minimal: 0.9, natural: 0.5, mode: 0.4 } },
  { name: "COMOLI", aliases: ["コモリ"], tier: 5, age: "25-50", taste: { minimal: 0.8, vintage: 0.4, natural: 0.6 } },
];

// 価格帯ごとの価格倍率（カタログ価格の生成に使う）
const TIER_MULT: Record<number, number> = { 1: 0.45, 2: 0.8, 3: 1.4, 4: 2.2, 5: 4.5 };

type Archetype = {
  sub: string;
  category: Category;
  name: string;
  base: number; // tier=3 相当の標準価格
  warmth: number;
  formality: number;
  colors: string[];
  tastes: string[]; // このアーキタイプを扱うブランドのテイスト
};

const ARCHETYPES: Archetype[] = [
  { sub: "tshirt", category: "TOPS", name: "ヘビーウェイトTシャツ", base: 5000, warmth: 1, formality: 15, colors: ["white", "black", "gray"], tastes: ["casual", "street", "minimal"] },
  { sub: "longsleeve", category: "TOPS", name: "ロングスリーブT", base: 6000, warmth: 2, formality: 20, colors: ["white", "navy", "khaki"], tastes: ["casual", "street", "vintage"] },
  { sub: "shirt", category: "TOPS", name: "オックスフォードシャツ", base: 9000, warmth: 2, formality: 65, colors: ["white", "lightblue"], tastes: ["kireime", "casual", "minimal"] },
  { sub: "shirt", category: "TOPS", name: "リネンシャツ", base: 9500, warmth: 1, formality: 55, colors: ["beige", "white"], tastes: ["natural", "minimal"] },
  { sub: "knit", category: "TOPS", name: "ミドルゲージニット", base: 11000, warmth: 3, formality: 55, colors: ["gray", "navy", "beige"], tastes: ["kireime", "minimal", "natural"] },
  { sub: "sweat", category: "TOPS", name: "クルーネックスウェット", base: 8000, warmth: 3, formality: 10, colors: ["gray", "navy"], tastes: ["casual", "street", "vintage"] },
  { sub: "hoodie", category: "TOPS", name: "プルオーバーパーカー", base: 10000, warmth: 3, formality: 5, colors: ["black", "gray"], tastes: ["street", "casual", "outdoor"] },
  { sub: "slacks", category: "BOTTOMS", name: "テーパードスラックス", base: 11000, warmth: 2, formality: 75, colors: ["black", "gray", "navy"], tastes: ["kireime", "mode", "minimal"] },
  { sub: "wide", category: "BOTTOMS", name: "ワイドパンツ", base: 10000, warmth: 2, formality: 45, colors: ["black", "beige"], tastes: ["mode", "minimal", "natural"] },
  { sub: "denim", category: "BOTTOMS", name: "ストレートデニム", base: 11000, warmth: 2, formality: 25, colors: ["blue", "black"], tastes: ["casual", "vintage", "street"] },
  { sub: "chino", category: "BOTTOMS", name: "チノパン", base: 8000, warmth: 2, formality: 45, colors: ["beige", "khaki", "navy"], tastes: ["casual", "kireime", "natural"] },
  { sub: "cargo", category: "BOTTOMS", name: "カーゴパンツ", base: 11000, warmth: 2, formality: 15, colors: ["khaki", "black"], tastes: ["street", "outdoor"] },
  { sub: "cardigan", category: "OUTER", name: "ニットカーディガン", base: 11000, warmth: 2, formality: 55, colors: ["navy", "gray", "beige"], tastes: ["kireime", "minimal", "natural", "casual"] },
  { sub: "shirt_jacket", category: "OUTER", name: "シャツジャケット", base: 13000, warmth: 2, formality: 45, colors: ["khaki", "navy"], tastes: ["casual", "vintage", "natural"] },
  { sub: "tailored", category: "OUTER", name: "テーラードジャケット", base: 22000, warmth: 3, formality: 85, colors: ["navy", "black", "gray"], tastes: ["kireime", "mode"] },
  { sub: "blouson", category: "OUTER", name: "ナイロンブルゾン", base: 16000, warmth: 3, formality: 30, colors: ["black", "khaki"], tastes: ["street", "casual"] },
  { sub: "mountain_parka", category: "OUTER", name: "マウンテンパーカー", base: 22000, warmth: 3, formality: 20, colors: ["black", "khaki", "navy"], tastes: ["outdoor", "street"] },
  { sub: "coat", category: "OUTER", name: "ステンカラーコート", base: 30000, warmth: 4, formality: 75, colors: ["beige", "black"], tastes: ["kireime", "minimal", "mode"] },
  { sub: "down", category: "OUTER", name: "ダウンジャケット", base: 30000, warmth: 5, formality: 25, colors: ["black", "navy"], tastes: ["outdoor", "casual", "minimal"] },
  { sub: "sneakers", category: "SHOES", name: "レザースニーカー", base: 13000, warmth: 2, formality: 35, colors: ["white", "black"], tastes: ["minimal", "casual", "kireime"] },
  { sub: "sneakers", category: "SHOES", name: "ランニングスニーカー", base: 14000, warmth: 2, formality: 15, colors: ["gray", "black"], tastes: ["casual", "street", "outdoor"] },
  { sub: "loafer", category: "SHOES", name: "ローファー", base: 18000, warmth: 2, formality: 70, colors: ["black", "brown"], tastes: ["kireime", "mode", "vintage"] },
  { sub: "boots", category: "SHOES", name: "サイドゴアブーツ", base: 22000, warmth: 3, formality: 50, colors: ["black", "brown"], tastes: ["mode", "vintage", "kireime"] },
  { sub: "rain_shoes", category: "SHOES", name: "防水スニーカー", base: 12000, warmth: 2, formality: 25, colors: ["black", "navy"], tastes: ["outdoor", "casual", "minimal"] },
  { sub: "tote", category: "BAG", name: "キャンバストート", base: 6000, warmth: 0, formality: 35, colors: ["beige", "black"], tastes: ["natural", "casual", "minimal"] },
  { sub: "backpack", category: "BAG", name: "デイパック", base: 12000, warmth: 0, formality: 15, colors: ["black", "navy"], tastes: ["outdoor", "street", "casual"] },
  { sub: "shoulder", category: "BAG", name: "ミニショルダー", base: 7000, warmth: 0, formality: 45, colors: ["black", "brown"], tastes: ["mode", "kireime", "street"] },
];

export type ProductSeed = {
  brand: string;
  category: Category;
  sub: string;
  name: string;
  price: number;
  color: string;
  warmth: number;
  formality: number;
};

// ブランドのテイストと合うアーキタイプだけを商品化する
export function buildCatalog(): ProductSeed[] {
  const out: ProductSeed[] = [];
  for (const b of BRANDS) {
    for (const a of ARCHETYPES) {
      if (b.cats && !b.cats.includes(a.category)) continue;
      const affinity = a.tastes.reduce((s, t) => s + (b.taste[t] ?? 0), 0);
      if (affinity < 0.5) continue;
      a.colors.forEach((color, i) => {
        if (i > 0 && affinity < 0.9) return; // 相性が弱いものは1色だけ
        const raw = a.base * TIER_MULT[b.tier] * (1 + i * 0.03);
        const price = Math.max(990, Math.round(raw / 100) * 100 - 10);
        out.push({
          brand: b.name,
          category: a.category,
          sub: a.sub,
          name: a.name,
          price,
          color,
          warmth: a.warmth,
          formality: Math.min(100, a.formality + (b.tier - 3) * 4),
        });
      });
    }
  }
  return out;
}

export type SampleItem = {
  brand: string | null;
  name: string;
  category: Category;
  sub: string;
  color: string;
  fit: "slim" | "regular" | "loose";
  materials: { name: string; pct: number }[];
  care: string[];
};

export const SAMPLE_WARDROBE: SampleItem[] = [
  { brand: "UNIQLO", name: "エアリズムコットンT", category: "TOPS", sub: "tshirt", color: "white", fit: "loose", materials: [{ name: "綿", pct: 100 }], care: ["wash_40", "tumble_low"] },
  { brand: "Champion", name: "リバースウィーブT", category: "TOPS", sub: "tshirt", color: "black", fit: "regular", materials: [{ name: "綿", pct: 100 }], care: ["wash_30", "no_tumble"] },
  { brand: "BEAMS", name: "オックスフォードBDシャツ", category: "TOPS", sub: "shirt", color: "lightblue", fit: "regular", materials: [{ name: "綿", pct: 100 }], care: ["wash_40", "iron_mid"] },
  { brand: "無印良品", name: "ウールクルーネックニット", category: "TOPS", sub: "knit", color: "gray", fit: "regular", materials: [{ name: "ウール", pct: 100 }], care: ["hand_wash", "flat_dry", "no_tumble"] },
  { brand: "GU", name: "スウェットパーカー", category: "TOPS", sub: "hoodie", color: "navy", fit: "loose", materials: [{ name: "綿", pct: 60 }, { name: "ポリエステル", pct: 40 }], care: ["wash_40"] },
  { brand: "Levi's", name: "501", category: "BOTTOMS", sub: "denim", color: "blue", fit: "regular", materials: [{ name: "綿", pct: 100 }], care: ["wash_30", "shade_dry"] },
  { brand: "UNIQLO", name: "スマートアンクルパンツ", category: "BOTTOMS", sub: "slacks", color: "black", fit: "slim", materials: [{ name: "ポリエステル", pct: 70 }, { name: "レーヨン", pct: 25 }, { name: "ポリウレタン", pct: 5 }], care: ["wash_30", "iron_low"] },
  { brand: "Dickies", name: "874ワークパンツ", category: "BOTTOMS", sub: "chino", color: "beige", fit: "loose", materials: [{ name: "ポリエステル", pct: 65 }, { name: "綿", pct: 35 }], care: ["wash_40"] },
  { brand: "無印良品", name: "ミドルゲージカーディガン", category: "OUTER", sub: "cardigan", color: "navy", fit: "regular", materials: [{ name: "綿", pct: 100 }], care: ["hand_wash", "flat_dry"] },
  { brand: "THE NORTH FACE", name: "コンパクトジャケット", category: "OUTER", sub: "mountain_parka", color: "black", fit: "regular", materials: [{ name: "ナイロン", pct: 100 }], care: ["wash_30", "no_iron"] },
  { brand: "CONVERSE", name: "オールスター", category: "SHOES", sub: "canvas", color: "white", fit: "regular", materials: [{ name: "綿", pct: 100 }], care: [] },
  { brand: "New Balance", name: "996", category: "SHOES", sub: "sneakers", color: "gray", fit: "regular", materials: [{ name: "スエード", pct: 60 }, { name: "メッシュ", pct: 40 }], care: [] },
  { brand: null, name: "黒レザーリュック", category: "BAG", sub: "backpack", color: "black", fit: "regular", materials: [{ name: "合成皮革", pct: 100 }], care: [] },
];
