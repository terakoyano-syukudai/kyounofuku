import type { Category, Fit, Period } from "./constants";
import type { Material } from "./engine/item-attrs";

export type BodyProfile = {
  heightCm: number | null;
  bodyShape: string;
  fitPref: number;
  topLengthPref: number;
  bottomLengthPref: number;
  coverConcerns: string[];
  heatSensitivity: number;
};

export type StylePreference = {
  formality: number;
  tasteTags: string[];
  colorLikes: string[];
  colorAvoids: string[];
  shopSection: "mens" | "womens" | "all"; // 買い足し検索の売り場
};

export type UserProfile = {
  id: string;
  name: string | null;
  areaName: string | null;
  lat: number | null;
  lon: number | null;
  onboarded: boolean;
  body: BodyProfile;
  style: StylePreference;
  budgets: Record<string, number>;
};

export type Brand = {
  id: string;
  name: string;
  aliases: string[];
  priceTier: number;
  targetAge: string;
  taste: Record<string, number>;
  source: "SEED" | "AI_ESTIMATED" | "UNKNOWN";
};

export type WardrobeItem = {
  id: string;
  brandId: string | null;
  brandName: string | null;
  name: string | null;
  category: Category;
  subCategory: string;
  color: string;
  fit: Fit;
  materials: Material[];
  careSymbols: string[];
  size: string | null;
  warmth: number;
  formality: number;
  breathability: number;
  lastWornAt: string | null;
  purchasedApprox: PurchaseApprox; // 購入時期（おおよそ）
  purchasedAt: string | null; // 購入時期から推定した日付（YYYY-MM-DD）。わからなければ null
  manualWears: string[]; // 詳細画面の「今日着た」で記録した日付
  hasPhoto: boolean; // 服全体の写真（端末内の IndexedDB に保存）
  aiRaw: unknown | null;
};

export const PURCHASE_APPROX = [
  { id: "recent", label: "最近", monthsAgo: 0 },
  { id: "this_year", label: "今年", monthsAgo: 4 },
  { id: "1y", label: "1年くらい前", monthsAgo: 12 },
  { id: "2_3y", label: "2〜3年前", monthsAgo: 30 },
  { id: "older", label: "それ以上前", monthsAgo: 48 },
  { id: "unknown", label: "わからない", monthsAgo: null },
] as const;
export type PurchaseApprox = (typeof PURCHASE_APPROX)[number]["id"];

export type Scene = {
  id: string;
  label: string;
  emoji: string;
  formality: number;
  activity: number;
  indoor: boolean;
  notes: string | null;
};

export type DayPlan = {
  date: string;
  slots: Record<Period, string | null>;
};

export type CatalogProduct = {
  id: string;
  brandId: string;
  brandName: string;
  category: Category;
  subCategory: string;
  name: string;
  price: number;
  color: string;
  warmth: number;
  formality: number;
  url: string | null;
};
