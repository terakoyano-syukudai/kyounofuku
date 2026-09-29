// 手持ち服の組み合わせを総当たりで採点し、上位のコーデを返す
import { FITS, subCategoryById } from "../constants";
import type { Brand, UserProfile, WardrobeItem } from "../types";
import { colorHarmony } from "./color";
import type { DayContext } from "./context";

export type Outfit = {
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  shoes: WardrobeItem | null;
  outer: WardrobeItem | null;
  bag: WardrobeItem | null;
  score: number;
  formality: number;
  warmthShort: number; // 最も寒い時間帯に足りない保温レベル
  reasons: string[];
};

export const outfitItems = (o: Outfit) => [o.outer, o.top, o.bottom, o.shoes, o.bag].filter((x): x is WardrobeItem => !!x);

const daysSince = (iso: string | null, today: string) =>
  iso ? Math.round((Date.parse(today) - Date.parse(iso)) / 86400000) : Infinity;

const fitValue = (fit: string) => FITS.find((f) => f.id === fit)?.value ?? 50;
const mobility = (i: WardrobeItem) => subCategoryById(i.subCategory)?.mobility ?? 70;
const isSuedeOrCanvas = (i: WardrobeItem) =>
  i.subCategory === "canvas" || i.materials.some((m) => /スエード|suede|キャンバス|canvas/i.test(m.name));

type Scorer = {
  user: UserProfile;
  ctx: DayContext;
  brands: Map<string, Brand>;
  taste: Record<string, number>;
  today: string;
};

function scoreCombo(
  s: Scorer,
  top: WardrobeItem | null,
  bottom: WardrobeItem | null,
  shoes: WardrobeItem | null,
  outer: WardrobeItem | null,
): Omit<Outfit, "bag"> {
  const { ctx, user } = s;
  let score = 0;
  const reasons: string[] = [];

  // 1. 保温: 一番暖かい時間帯はトップス1枚、寒い時間帯は羽織り込みで足りるか
  const topW = top?.warmth ?? 0;
  const total = topW + (outer?.warmth ?? 0);
  const overheat = topW - ctx.reqAtWarmest;
  if (overheat > 1) score -= (overheat - 1) * 8;
  if (overheat < 0) score -= -overheat * (outer ? 3 : 10);
  const short = Math.max(0, ctx.reqAtColdest - total);
  score -= short * 15;
  if (outer && total - ctx.reqAtColdest > 2) score -= (total - ctx.reqAtColdest - 2) * 5;
  if (!outer && short === 0) score += 3;
  if (outer && short === 0 && ctx.reqAtColdest > topW) reasons.push(`体感${ctx.feelsMin}℃まで下がる時間帯も${outer.name ?? "羽織り"}でカバー`);

  // 2. TPO: いちばんきちんとした場面に合わせる
  const parts: [WardrobeItem | null, number][] = [
    [top, 0.35],
    [bottom, 0.3],
    [shoes, 0.2],
    [outer, 0.15],
  ];
  const wsum = parts.reduce((a, [i, w]) => a + (i ? w : 0), 0) || 1;
  const formality = Math.round(parts.reduce((a, [i, w]) => a + (i ? i.formality * w : 0), 0) / wsum);
  score -= Math.abs(formality - ctx.targetFormality) * 0.25;
  for (const [i] of parts) if (i && i.formality < ctx.minFormality) score -= (ctx.minFormality - i.formality) * 0.4;

  // 3. 動きやすさ
  if (ctx.maxActivity >= 70) {
    for (const [i] of parts) if (i && mobility(i) < 60) score -= (60 - mobility(i)) * 0.3;
    if (shoes && mobility(shoes) >= 90) reasons.push("よく動く日なので歩きやすい靴");
  }

  // 4. 雨・湿度
  if (ctx.rainProb >= 50 && shoes) {
    if (subCategoryById(shoes.subCategory)?.rainOk) {
      score += 6;
      reasons.push("雨でも安心な靴");
    } else if (isSuedeOrCanvas(shoes)) score -= 6;
  }
  if (ctx.hotHumid && top && top.breathability < 3) score -= (3 - top.breathability) * 4;
  if (ctx.hotHumid && top && top.breathability >= 4) reasons.push("蒸し暑いので通気性のいい素材");

  // 5. 配色と色の好み
  const colors = [top, bottom, shoes, outer].filter((x): x is WardrobeItem => !!x).map((i) => i.color);
  const harmony = colorHarmony(colors);
  score += harmony.score;
  if (harmony.note) reasons.push(harmony.note);
  for (const c of colors) {
    if (user.style.colorLikes.includes(c)) score += 2;
    if (user.style.colorAvoids.includes(c)) score -= 10;
  }

  // 6. サイズ感と体型カバー
  for (const i of [top, bottom]) if (i) score -= Math.abs(fitValue(i.fit) - user.body.fitPref) / 25;
  const concerns = user.body.coverConcerns;
  if (top && top.fit === "slim" && concerns.some((c) => ["belly", "hip", "thin"].includes(c))) score -= 6;
  if (bottom && ["shorts", "skirt"].includes(bottom.subCategory) && concerns.includes("legs")) score -= 15;
  if (bottom && bottom.fit === "loose" && concerns.includes("hip")) score += 2;
  if (top && bottom && concerns.includes("height") && top.color === bottom.color) {
    score += 4;
    reasons.push("上下の色をつなげて縦長に見せる");
  }

  // 7. テイスト（ブランドから推定）
  for (const i of [top, bottom, shoes, outer]) {
    const b = i?.brandId ? s.brands.get(i.brandId) : undefined;
    if (b) for (const [k, v] of Object.entries(b.taste)) score += (s.taste[k] ?? 0) * v * 0.8;
  }

  // 8. ローテーション（直近に着た服は少し避ける。今日「これを着る」にした服は対象外）
  for (const i of [top, bottom]) {
    const d = i ? daysSince(i.lastWornAt, s.today) : Infinity;
    if (d === 0) continue;
    if (d <= 1) score -= 8;
    else if (d <= 3) score -= 3;
  }

  return { top, bottom, shoes, outer, score: Math.round(score * 10) / 10, formality, warmthShort: short, reasons };
}

export function generateOutfits(
  user: UserProfile,
  ctx: DayContext,
  items: WardrobeItem[],
  brands: Brand[],
  taste: Record<string, number>,
  today: string,
  limit = 3,
): Outfit[] {
  const by = (cat: string) => items.filter((i) => i.category === cat);
  const orNull = (xs: WardrobeItem[]) => (xs.length ? xs : [null]);
  const tops = orNull(by("TOPS"));
  const bottoms = orNull(by("BOTTOMS"));
  const shoesList = orNull(by("SHOES"));
  const outers: (WardrobeItem | null)[] = [null, ...by("OUTER")];
  const s: Scorer = { user, ctx, brands: new Map(brands.map((b) => [b.id, b])), taste, today };

  const all: Omit<Outfit, "bag">[] = [];
  for (const t of tops) for (const b of bottoms) for (const sh of shoesList) for (const o of outers) all.push(scoreCombo(s, t, b, sh, o));
  all.sort((a, b) => b.score - a.score);

  // 代替案はトップスかボトムスが違うものにする
  const picked: Omit<Outfit, "bag">[] = [];
  for (const o of all) {
    if (picked.every((p) => p.top?.id !== o.top?.id || p.bottom?.id !== o.bottom?.id)) picked.push(o);
    if (picked.length >= limit) break;
  }

  const bags = by("BAG");
  return picked.map((o) => {
    const bag =
      bags
        .map((b) => ({
          b,
          sc: -Math.abs(b.formality - o.formality) * 0.2 + (ctx.maxActivity >= 70 && b.subCategory === "backpack" ? 5 : 0),
        }))
        .sort((x, y) => y.sc - x.sc)[0]?.b ?? null;
    return { ...o, bag };
  });
}
