// アプリ全体で使うマスタ定義（クライアント・サーバー共通）

export const CATEGORIES = ["TOPS", "BOTTOMS", "OUTER", "SHOES", "BAG", "ACC"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  TOPS: "トップス",
  BOTTOMS: "ボトムス",
  OUTER: "アウター・羽織り",
  SHOES: "シューズ",
  BAG: "バッグ",
  ACC: "小物",
};

// サブカテゴリ: 保温性・フォーマル度・動きやすさの初期値を持たせる
export type SubCategoryDef = {
  id: string;
  label: string;
  category: Category;
  warmth: number; // 1-5
  formality: number; // 0-100
  mobility: number; // 0-100 動きやすさ
  rainOk?: boolean; // 雨の日向き（シューズ）
};

export const SUB_CATEGORIES: SubCategoryDef[] = [
  { id: "tshirt", label: "Tシャツ", category: "TOPS", warmth: 1, formality: 15, mobility: 95 },
  { id: "longsleeve", label: "ロンT", category: "TOPS", warmth: 2, formality: 20, mobility: 90 },
  { id: "polo", label: "ポロシャツ", category: "TOPS", warmth: 1, formality: 45, mobility: 85 },
  { id: "shirt", label: "シャツ", category: "TOPS", warmth: 2, formality: 65, mobility: 70 },
  { id: "blouse", label: "ブラウス", category: "TOPS", warmth: 2, formality: 60, mobility: 70 },
  { id: "knit", label: "ニット", category: "TOPS", warmth: 3, formality: 50, mobility: 75 },
  { id: "sweat", label: "スウェット", category: "TOPS", warmth: 3, formality: 10, mobility: 95 },
  { id: "hoodie", label: "パーカー", category: "TOPS", warmth: 3, formality: 5, mobility: 90 },
  { id: "denim", label: "デニム", category: "BOTTOMS", warmth: 2, formality: 25, mobility: 70 },
  { id: "chino", label: "チノパン", category: "BOTTOMS", warmth: 2, formality: 45, mobility: 80 },
  { id: "slacks", label: "スラックス", category: "BOTTOMS", warmth: 2, formality: 75, mobility: 65 },
  { id: "wide", label: "ワイドパンツ", category: "BOTTOMS", warmth: 2, formality: 40, mobility: 90 },
  { id: "cargo", label: "カーゴパンツ", category: "BOTTOMS", warmth: 2, formality: 15, mobility: 90 },
  { id: "shorts", label: "ショーツ", category: "BOTTOMS", warmth: 1, formality: 10, mobility: 95 },
  { id: "skirt", label: "スカート", category: "BOTTOMS", warmth: 1, formality: 55, mobility: 65 },
  { id: "cardigan", label: "カーディガン", category: "OUTER", warmth: 2, formality: 50, mobility: 85 },
  { id: "shirt_jacket", label: "シャツジャケット", category: "OUTER", warmth: 2, formality: 40, mobility: 80 },
  { id: "denim_jacket", label: "Gジャン", category: "OUTER", warmth: 2, formality: 25, mobility: 70 },
  { id: "tailored", label: "テーラードジャケット", category: "OUTER", warmth: 3, formality: 85, mobility: 55 },
  { id: "blouson", label: "ブルゾン", category: "OUTER", warmth: 3, formality: 30, mobility: 80 },
  { id: "mountain_parka", label: "マウンテンパーカー", category: "OUTER", warmth: 3, formality: 20, mobility: 85 },
  { id: "coat", label: "コート", category: "OUTER", warmth: 4, formality: 75, mobility: 55 },
  { id: "down", label: "ダウン", category: "OUTER", warmth: 5, formality: 25, mobility: 70 },
  { id: "sneakers", label: "スニーカー", category: "SHOES", warmth: 2, formality: 15, mobility: 95 },
  { id: "canvas", label: "キャンバススニーカー", category: "SHOES", warmth: 1, formality: 15, mobility: 90 },
  { id: "leather", label: "革靴", category: "SHOES", warmth: 2, formality: 85, mobility: 45 },
  { id: "loafer", label: "ローファー", category: "SHOES", warmth: 2, formality: 70, mobility: 55 },
  { id: "boots", label: "ブーツ", category: "SHOES", warmth: 3, formality: 45, mobility: 60, rainOk: true },
  { id: "rain_shoes", label: "レインシューズ", category: "SHOES", warmth: 2, formality: 25, mobility: 75, rainOk: true },
  { id: "sandals", label: "サンダル", category: "SHOES", warmth: 0, formality: 5, mobility: 70 },
  { id: "tote", label: "トート", category: "BAG", warmth: 0, formality: 40, mobility: 70 },
  { id: "backpack", label: "リュック", category: "BAG", warmth: 0, formality: 15, mobility: 95 },
  { id: "shoulder", label: "ショルダー", category: "BAG", warmth: 0, formality: 45, mobility: 90 },
  { id: "cap", label: "キャップ", category: "ACC", warmth: 0, formality: 10, mobility: 90 },
  { id: "scarf", label: "マフラー・ストール", category: "ACC", warmth: 1, formality: 50, mobility: 80 },
];

export const subCategoryById = (id: string) => SUB_CATEGORIES.find((s) => s.id === id);

// 色ファミリー（タグ写真からは色がわからないため、登録時にチップで選ぶ）
export const COLOR_FAMILIES = [
  { id: "black", label: "ブラック", hex: "#1c1c1e" },
  { id: "white", label: "ホワイト", hex: "#f5f5f0" },
  { id: "gray", label: "グレー", hex: "#9ca3af" },
  { id: "navy", label: "ネイビー", hex: "#1e2a4a" },
  { id: "beige", label: "ベージュ", hex: "#d6c7a8" },
  { id: "brown", label: "ブラウン", hex: "#7a5236" },
  { id: "khaki", label: "カーキ", hex: "#7c7a4f" },
  { id: "green", label: "グリーン", hex: "#3f7a4a" },
  { id: "blue", label: "ブルー", hex: "#4a7bc8" },
  { id: "lightblue", label: "サックス", hex: "#a8c8e8" },
  { id: "red", label: "レッド", hex: "#b83a3a" },
  { id: "pink", label: "ピンク", hex: "#e8a5b8" },
  { id: "yellow", label: "イエロー", hex: "#e8c84a" },
  { id: "orange", label: "オレンジ", hex: "#e0823a" },
  { id: "purple", label: "パープル", hex: "#7a5aa8" },
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number]["id"];
export const NEUTRAL_COLORS: string[] = ["black", "white", "gray", "navy", "beige"];
export const colorById = (id: string) => COLOR_FAMILIES.find((c) => c.id === id) ?? COLOR_FAMILIES[2];

export const FITS = [
  { id: "slim", label: "細身", value: 0 },
  { id: "regular", label: "ふつう", value: 50 },
  { id: "loose", label: "ゆったり", value: 100 },
] as const;
export type Fit = (typeof FITS)[number]["id"];

// 洗濯表示（JIS L0001 をざっくり）
export const CARE_SYMBOLS: { id: string; label: string; icon: string }[] = [
  { id: "wash_30", label: "洗濯機30℃", icon: "🫧30" },
  { id: "wash_40", label: "洗濯機40℃", icon: "🫧40" },
  { id: "hand_wash", label: "手洗い", icon: "✋" },
  { id: "no_wash", label: "水洗い不可", icon: "🚫🫧" },
  { id: "no_bleach", label: "漂白不可", icon: "🚫△" },
  { id: "tumble_low", label: "乾燥機（低温）", icon: "◎" },
  { id: "no_tumble", label: "乾燥機不可", icon: "🚫◎" },
  { id: "hang_dry", label: "つり干し", icon: "⌇" },
  { id: "shade_dry", label: "陰干し", icon: "⛱" },
  { id: "flat_dry", label: "平干し", icon: "▭" },
  { id: "iron_low", label: "アイロン低温", icon: "♨·" },
  { id: "iron_mid", label: "アイロン中温", icon: "♨··" },
  { id: "no_iron", label: "アイロン不可", icon: "🚫♨" },
  { id: "dry_clean", label: "ドライ可", icon: "Ⓟ" },
  { id: "no_dry_clean", label: "ドライ不可", icon: "🚫Ⓟ" },
];
export const careById = (id: string) => CARE_SYMBOLS.find((c) => c.id === id);

export const TASTE_TAGS = [
  { id: "minimal", label: "ミニマル", emoji: "⬜" },
  { id: "street", label: "ストリート", emoji: "🛹" },
  { id: "kireime", label: "きれいめ", emoji: "👔" },
  { id: "casual", label: "カジュアル", emoji: "👕" },
  { id: "vintage", label: "古着・ヴィンテージ", emoji: "📻" },
  { id: "outdoor", label: "アウトドア", emoji: "⛰" },
  { id: "mode", label: "モード", emoji: "🖤" },
  { id: "natural", label: "ナチュラル", emoji: "🌿" },
] as const;
export type TasteTag = (typeof TASTE_TAGS)[number]["id"];

export const BODY_SHAPES = [
  { id: "straight", label: "ストレート", desc: "上半身に厚みがあり、メリハリのある体型" },
  { id: "wave", label: "ウェーブ", desc: "華奢で下半身に重心がある体型" },
  { id: "natural", label: "ナチュラル", desc: "骨格がしっかりしていてフレーム感がある体型" },
  { id: "unknown", label: "わからない", desc: "あとで変更できます" },
] as const;

export const COVER_CONCERNS = [
  { id: "belly", label: "お腹まわり" },
  { id: "hip", label: "お尻・腰まわり" },
  { id: "legs", label: "脚を出したくない" },
  { id: "shoulder", label: "肩幅・二の腕" },
  { id: "height", label: "低身長に見られたくない" },
  { id: "thin", label: "細さを目立たせたくない" },
] as const;

export const PERIODS = ["MORNING", "NOON", "EVENING", "NIGHT"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_META: Record<Period, { label: string; emoji: string; hours: [number, number] }> = {
  MORNING: { label: "朝", emoji: "🌅", hours: [7, 10] },
  NOON: { label: "昼", emoji: "☀️", hours: [11, 15] },
  EVENING: { label: "夕", emoji: "🌇", hours: [16, 18] },
  NIGHT: { label: "夜", emoji: "🌙", hours: [19, 23] },
};

export const BUDGET_CATEGORIES: Category[] = ["TOPS", "BOTTOMS", "OUTER", "SHOES", "BAG"];
export const DEFAULT_BUDGETS: Record<string, number> = {
  TOPS: 5000,
  BOTTOMS: 7000,
  OUTER: 12000,
  SHOES: 10000,
  BAG: 6000,
};

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
