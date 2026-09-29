// 手持ち服のブランドから、好みの価格帯・客層・テイストを推定する
import { TASTE_TAGS } from "../constants";
import type { Brand, UserProfile, WardrobeItem } from "../types";

export type BrandProfile = {
  itemCount: number;
  brandedCount: number;
  avgTier: number | null;
  tierLabel: string | null;
  priceRange: string | null;
  ageBand: string | null;
  taste: Record<string, number>; // 0-1 正規化済み
  topTastes: { id: string; label: string; score: number }[];
  topBrands: { name: string; count: number }[];
};

const TIER_LABEL = ["", "ファスト・プチプラ", "カジュアルブランド", "セレクトショップ", "上位セレクト・国内ブランド", "デザイナーズ"];
const TIER_PRICE = ["", "〜¥5,000", "¥3,000〜¥10,000", "¥8,000〜¥20,000", "¥15,000〜¥40,000", "¥30,000〜"];

export function buildBrandProfile(items: WardrobeItem[], brands: Brand[]): BrandProfile {
  const byId = new Map(brands.map((b) => [b.id, b]));
  const owned = items.map((i) => (i.brandId ? byId.get(i.brandId) : undefined)).filter((b): b is Brand => !!b);

  const counts = new Map<string, number>();
  const taste: Record<string, number> = {};
  const ages = new Map<string, number>();
  let tierSum = 0;
  for (const b of owned) {
    counts.set(b.name, (counts.get(b.name) ?? 0) + 1);
    tierSum += b.priceTier;
    ages.set(b.targetAge, (ages.get(b.targetAge) ?? 0) + 1);
    for (const [k, v] of Object.entries(b.taste)) taste[k] = (taste[k] ?? 0) + v;
  }
  const maxTaste = Math.max(0, ...Object.values(taste));
  const normTaste = Object.fromEntries(Object.entries(taste).map(([k, v]) => [k, maxTaste ? v / maxTaste : 0]));
  const avgTier = owned.length ? tierSum / owned.length : null;
  const tierIdx = avgTier ? Math.round(avgTier) : 0;

  return {
    itemCount: items.length,
    brandedCount: owned.length,
    avgTier: avgTier ? Math.round(avgTier * 10) / 10 : null,
    tierLabel: avgTier ? TIER_LABEL[tierIdx] : null,
    priceRange: avgTier ? TIER_PRICE[tierIdx] : null,
    ageBand: [...ages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    taste: normTaste,
    topTastes: TASTE_TAGS.map((t) => ({ id: t.id, label: t.label, score: normTaste[t.id] ?? 0 }))
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    topBrands: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

/** 本人が選んだテイストと、手持ちから推定したテイストを合成 */
export function effectiveTaste(user: UserProfile, profile: BrandProfile): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of user.style.tasteTags) out[t] = (out[t] ?? 0) + 1;
  for (const [k, v] of Object.entries(profile.taste)) out[k] = (out[k] ?? 0) + v * 0.7;
  return out;
}

function cosine(a: Record<string, number>, b: Record<string, number>) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    dot += (a[k] ?? 0) * (b[k] ?? 0);
    na += (a[k] ?? 0) ** 2;
    nb += (b[k] ?? 0) ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** ブランドとの相性 0〜1.3 */
export function brandAffinity(brand: Brand, profile: BrandProfile, taste: Record<string, number>, ownedNames: Set<string>) {
  const tierFit = profile.avgTier == null ? 0.5 : 1 - Math.min(1, Math.abs(brand.priceTier - profile.avgTier) / 3);
  return tierFit * 0.5 + cosine(brand.taste, taste) * 0.5 + (ownedNames.has(brand.name) ? 0.3 : 0);
}

export { cosine };
