// 1日の提案を組み立てるエントリポイント（純粋関数。DB・APIには依存しない）
import type { Brand, DayPlan, Scene, UserProfile, WardrobeItem } from "../types";
import type { DayWeather } from "../weather";
import { buildHeadline, buildSlotAdvice, type SlotAdvice } from "./advice";
import { buildBrandProfile, effectiveTaste, type BrandProfile } from "./brand-profile";
import { buildContext, type DayContext } from "./context";
import { generateOutfits, type Outfit } from "./outfit";
import { detectGaps, type Gap, type ShopContext } from "./shopping";

export type DayProposal = {
  ctx: DayContext;
  outfit: Outfit;
  alternatives: Outfit[];
  headline: { main: string[]; note: string | null };
  advice: SlotAdvice[];
  gaps: Gap[];
  brandProfile: BrandProfile;
  shop: ShopContext; // 買い足し候補の検索に使う（商品検索は非同期で別に行う）
};

export function proposeDay(input: {
  user: UserProfile;
  plan: DayPlan;
  weather: DayWeather;
  scenes: Scene[];
  items: WardrobeItem[];
  brands: Brand[];
  today: string;
  altIndex?: number;
}): DayProposal {
  const { user, plan, weather, scenes, items, brands, today } = input;
  const ctx = buildContext(user, plan, weather, scenes);
  const brandProfile = buildBrandProfile(items, brands);
  const taste = effectiveTaste(user, brandProfile);
  const outfits = generateOutfits(user, ctx, items, brands, taste, today, 3);
  const empty: Outfit = { top: null, bottom: null, shoes: null, outer: null, bag: null, score: 0, formality: 0, warmthShort: 0, reasons: [] };
  const idx = Math.min(input.altIndex ?? 0, Math.max(0, outfits.length - 1));
  const outfit = outfits[idx] ?? empty;
  const advice = buildSlotAdvice(ctx, outfit);

  return {
    ctx,
    outfit,
    alternatives: outfits,
    headline: buildHeadline(outfit, advice),
    advice,
    gaps: detectGaps(ctx, items, outfit),
    brandProfile,
    shop: { user, outfit, profile: brandProfile, taste, brands },
  };
}
