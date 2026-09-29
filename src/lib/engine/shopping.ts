// 不足アイテムの検出と、買い足し候補のランキング（商品の出どころには依存しない）
import { CATEGORY_LABEL, DEFAULT_BUDGETS, subCategoryById, type Category } from "../constants";
import type { Brand, UserProfile, WardrobeItem } from "../types";
import { brandAffinity, type BrandProfile } from "./brand-profile";
import { colorHarmony } from "./color";
import type { DayContext } from "./context";
import { outfitItems, type Outfit } from "./outfit";

export type Gap = {
  category: Category;
  reason: string;
  minWarmth: number;
  minFormality: number;
  subHints: string[];
};

export function detectGaps(ctx: DayContext, items: WardrobeItem[], best: Outfit): Gap[] {
  const gaps: Gap[] = [];
  const has = (c: Category) => items.some((i) => i.category === c);
  // 手持ちにないカテゴリは、今日の気温とTPOに合う定番から
  const basics: Record<string, string> = {
    TOPS: ctx.targetFormality >= 55 ? "shirt" : ctx.reqAtWarmest >= 3 ? "knit" : ctx.reqAtWarmest >= 2 ? "longsleeve" : "tshirt",
    BOTTOMS: ctx.targetFormality >= 55 ? "slacks" : "chino",
    SHOES: ctx.targetFormality >= 65 ? "loafer" : "sneakers",
  };
  for (const c of ["TOPS", "BOTTOMS", "SHOES"] as Category[]) {
    if (!has(c)) gaps.push({ category: c, reason: `${CATEGORY_LABEL[c]}がまだ登録されていません`, minWarmth: 0, minFormality: 0, subHints: [basics[c]] });
  }

  if (best.warmthShort > 0) {
    const coldest = ctx.active.reduce((a, b) => (a.feels < b.feels ? a : b));
    const minWarmth = Math.max(2, ctx.reqAtColdest - (best.top?.warmth ?? 1));
    const formal = ctx.targetFormality >= 60;
    const outer =
      minWarmth >= 5 ? ["down"] : minWarmth === 4 ? ["coat"] : minWarmth === 3 ? (formal ? ["tailored"] : ["mountain_parka", "blouson"]) : formal ? ["cardigan"] : ["cardigan", "shirt_jacket"];
    gaps.push({
      category: "OUTER",
      reason: `体感${coldest.feels}℃まで下がる時間帯に、手持ちでは保温が足りません`,
      minWarmth,
      minFormality: Math.max(0, ctx.minFormality - 10),
      subHints: outer,
    });
  }

  const formalScene = ctx.active.filter((s) => s.scene).sort((a, b) => b.scene!.formality - a.scene!.formality)[0]?.scene;
  if (formalScene) {
    const low = outfitItems(best).filter((i) => i.category !== "BAG" && i.formality < ctx.minFormality - 10);
    const worst = low.sort((a, b) => a.formality - b.formality)[0];
    if (worst && !gaps.some((g) => g.category === worst.category)) {
      gaps.push({
        category: worst.category,
        reason: `「${formalScene.label}」に合うきれいめな${CATEGORY_LABEL[worst.category]}が手持ちにありません`,
        minWarmth: 0,
        minFormality: ctx.minFormality,
        subHints: [{ TOPS: "shirt", BOTTOMS: "slacks", SHOES: "loafer", OUTER: "tailored" }[worst.category as string] ?? ""].filter(Boolean),
      });
    }
  }

  if (ctx.rainProb >= 60 && !items.some((i) => subCategoryById(i.subCategory)?.rainOk) && !gaps.some((g) => g.category === "SHOES")) {
    gaps.push({ category: "SHOES", reason: `降水確率${ctx.rainProb}%。雨に強い靴があると安心`, minWarmth: 0, minFormality: 0, subHints: ["rain_shoes", "boots"] });
  }
  return gaps.slice(0, 3);
}

/** 疑似カタログ・楽天などの商品を共通の形に揃えたもの */
export type ProductCandidate = {
  id: string;
  source: "catalog" | "rakuten";
  brandId: string | null;
  brandName: string | null;
  name: string;
  price: number;
  color: string | null; // 色ファミリー（わからなければ null）
  imageUrl: string | null;
  url: string | null;
  shopName: string | null;
  rating: { avg: number; count: number } | null;
};

export type RankedProduct = ProductCandidate & { why: string };

export type Suggestion = {
  gap: Gap;
  budget: number;
  products: RankedProduct[];
  source: "catalog" | "rakuten";
  error?: string;
};

export type ShopContext = {
  user: UserProfile;
  outfit: Outfit;
  profile: BrandProfile;
  taste: Record<string, number>;
  brands: Brand[];
};

export const budgetFor = (user: UserProfile, c: Category) => user.budgets[c] ?? DEFAULT_BUDGETS[c] ?? 10000;

export function rankProducts(gap: Gap, candidates: ProductCandidate[], s: ShopContext, limit = 3): RankedProduct[] {
  const brandMap = new Map(s.brands.map((b) => [b.id, b]));
  const ownedNames = new Set(s.profile.topBrands.map((b) => b.name));
  const budget = budgetFor(s.user, gap.category);
  // 買い足すカテゴリ以外の今日の服と色を合わせる
  const outfitColors = outfitItems(s.outfit)
    .filter((i) => i.category !== gap.category && i.category !== "BAG")
    .map((i) => i.color);

  const scored = candidates
    .filter((p) => p.price <= budget)
    .filter((p) => !p.color || !s.user.style.colorAvoids.includes(p.color))
    .map((p) => {
      const brand = p.brandId ? brandMap.get(p.brandId) : undefined;
      const aff = brand ? brandAffinity(brand, s.profile, s.taste, ownedNames) : 0.3;
      const harmony = p.color ? colorHarmony([...outfitColors, p.color]).score : 0;
      const valueFit = p.price / budget >= 0.4 ? 1 : 0; // 予算を活かせているか
      const liked = p.color && s.user.style.colorLikes.includes(p.color) ? 2 : 0;
      const review = p.rating ? (p.rating.avg - 3.5) * Math.min(1, p.rating.count / 30) * 2 : 0;
      const why =
        brand && ownedNames.has(brand.name)
          ? `手持ちにある${brand.name}`
          : brand && aff >= 0.7
            ? "手持ちブランドと価格帯・テイストが近い"
            : p.rating && p.rating.count >= 30 && p.rating.avg >= 4.2
              ? `レビュー${p.rating.avg.toFixed(1)}（${p.rating.count}件）`
              : p.color && harmony > 0
                ? "今日のコーデに色が合う"
                : "予算内で条件に合う";
      return { ...p, why, score: aff * 10 + harmony + valueFit + liked + review };
    })
    .sort((a, b) => b.score - a.score);

  // 同じブランド・同じショップばかりにならないように
  const out: RankedProduct[] = [];
  const seen = new Set<string>();
  for (const { score: _, ...p } of scored) {
    void _;
    const key = p.brandId ?? p.shopName ?? p.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}
