"use client";

// スマホ（ブラウザ）の中だけにデータを保存するストア。サーバーは使わない。
// データは localStorage に JSON 1件で保存し、書き出し・読み込みでバックアップできる。
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { CATEGORIES, DEFAULT_BUDGETS, PERIODS, type Category, type Period } from "./constants";
import { BRANDS, SAMPLE_WARDROBE, SCENES, buildCatalog } from "./db/seed-data";
import { deriveItemAttrs, type Material } from "./engine/item-attrs";
import { allPhotos, deletePhoto, replaceAllPhotos } from "./photo";
import { PURCHASE_APPROX, type BodyProfile, type Brand, type CatalogProduct, type DayPlan, type PurchaseApprox, type Scene, type StylePreference, type UserProfile, type WardrobeItem } from "./types";

const KEY = "kyounofuku:data";
const VERSION = 2;

type StoredItem = Omit<WardrobeItem, "brandName">;
export type AppData = {
  version: number;
  user: Omit<UserProfile, "id">;
  items: StoredItem[];
  customBrands: Brand[];
  plans: Record<string, Record<Period, string | null>>;
  wearLogs: Record<string, string[]>;
};

const defaultData = (): AppData => ({
  version: VERSION,
  user: {
    name: null,
    areaName: "東京",
    lat: 35.6812,
    lon: 139.7671,
    onboarded: false,
    body: { heightCm: null, bodyShape: "unknown", fitPref: 50, topLengthPref: 50, bottomLengthPref: 50, coverConcerns: [], heatSensitivity: 50 },
    style: { formality: 40, tasteTags: [], colorLikes: [], colorAvoids: [], shopSection: "all" },
    budgets: { ...DEFAULT_BUDGETS },
  },
  items: [],
  customBrands: [],
  plans: {},
  wearLogs: {},
});

// ───── 読み書きと購読（React の useSyncExternalStore 用） ─────
let cache: AppData | null = null;
const listeners = new Set<() => void>();

function read(): AppData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? migrate(JSON.parse(raw) as AppData) : defaultData();
  } catch {
    cache = defaultData();
  }
  return cache;
}

/** 古い形式のデータに、後から追加した項目の初期値を補う */
function migrate(d: AppData): AppData {
  const base = { ...defaultData(), ...d };
  return {
    ...base,
    version: VERSION,
    items: base.items.map((i) => ({
      ...i,
      purchasedApprox: i.purchasedApprox ?? "unknown",
      purchasedAt: i.purchasedAt ?? null,
      manualWears: i.manualWears ?? [],
      hasPhoto: i.hasPhoto ?? false,
    })),
  };
}

function write(next: AppData) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.error("[store] 保存に失敗しました", e);
  }
  listeners.forEach((l) => l());
}

const update = (fn: (d: AppData) => AppData) => write(fn(read()));

function subscribe(l: () => void) {
  listeners.add(l);
  // 別タブでの変更も反映
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** サーバー側の事前描画では null（= 読み込み中）を返す */
export function useAppData(): AppData | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** データが消えにくいように、ブラウザに永続化を依頼する */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => undefined);
}

// ───── ブランド ─────
const seedBrands: Brand[] = BRANDS.map((b) => ({
  id: `seed:${b.name}`,
  name: b.name,
  aliases: b.aliases,
  priceTier: b.tier,
  targetAge: b.age,
  taste: b.taste,
  source: "SEED",
}));

export const allBrands = (d: AppData): Brand[] => [...seedBrands, ...d.customBrands];

const normName = (s: string) => s.toLowerCase().replace(/[\s・.'’\-_&]/g, "");

export function findBrand(d: AppData, name: string): Brand | null {
  const key = normName(name);
  if (!key) return null;
  return allBrands(d).find((b) => normName(b.name) === key || b.aliases.some((a) => normName(a) === key)) ?? null;
}

// ───── ユーザー ─────
export const toUser = (d: AppData): UserProfile => ({ id: "me", ...d.user });

export function saveProfile(body: BodyProfile, style: StylePreference, budgets: Record<string, number>) {
  update((d) => ({ ...d, user: { ...d.user, body, style, budgets, onboarded: true } }));
}

export function saveLocation(areaName: string, lat: number, lon: number) {
  update((d) => ({ ...d, user: { ...d.user, areaName, lat, lon } }));
}

// ───── ワードローブ ─────
export function listItems(d: AppData): WardrobeItem[] {
  const brands = new Map(allBrands(d).map((b) => [b.id, b.name]));
  const order = (c: Category) => CATEGORIES.indexOf(c);
  return d.items
    .map((i) => ({ ...i, brandName: i.brandId ? (brands.get(i.brandId) ?? null) : null }))
    .sort((a, b) => order(a.category) - order(b.category));
}

/** 購入時期（おおよそ）から推定日付を出す */
export function estimatePurchasedAt(approx: PurchaseApprox, base = new Date()): string | null {
  const m = PURCHASE_APPROX.find((p) => p.id === approx)?.monthsAgo;
  if (m == null) return null;
  const d = new Date(base);
  d.setMonth(d.getMonth() - m);
  return d.toISOString().slice(0, 10);
}

export type NewItemInput = {
  purchasedApprox: PurchaseApprox;
  hasPhoto: boolean;
  brandName: string;
  name: string | null;
  category: Category;
  subCategory: string;
  color: string;
  fit: WardrobeItem["fit"];
  materials: Material[];
  careSymbols: string[];
  size: string | null;
  aiRaw?: unknown;
};

export function addItem(input: NewItemInput): string {
  const id = crypto.randomUUID();
  update((d) => {
    let customBrands = d.customBrands;
    let brandId: string | null = null;
    const name = input.brandName.trim();
    if (name) {
      const known = findBrand(d, name);
      if (known) brandId = known.id;
      else {
        // 知らないブランドは標準的な価格帯として登録（手持ちが増えると傾向の推定に使われる）
        const b: Brand = { id: `custom:${crypto.randomUUID()}`, name, aliases: [], priceTier: 3, targetAge: "20-35", taste: {}, source: "UNKNOWN" };
        customBrands = [...customBrands, b];
        brandId = b.id;
      }
    }
    const attrs = deriveItemAttrs(input.subCategory, input.materials);
    const item: StoredItem = {
      id,
      brandId,
      name: input.name,
      category: input.category,
      subCategory: input.subCategory,
      color: input.color,
      fit: input.fit,
      materials: input.materials.filter((m) => m.name.trim()),
      careSymbols: input.careSymbols,
      size: input.size,
      ...attrs,
      lastWornAt: null,
      purchasedApprox: input.purchasedApprox,
      purchasedAt: estimatePurchasedAt(input.purchasedApprox),
      manualWears: [],
      hasPhoto: input.hasPhoto,
      aiRaw: input.aiRaw ?? null,
    };
    return { ...d, customBrands, items: [item, ...d.items] };
  });
  return id;
}

export function deleteItem(id: string) {
  update((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
  deletePhoto(id).catch(() => undefined);
}

export function updateItem(id: string, patch: Partial<Pick<StoredItem, "purchasedApprox" | "hasPhoto" | "color">>) {
  update((d) => ({
    ...d,
    items: d.items.map((i) =>
      i.id !== id
        ? i
        : {
            ...i,
            ...patch,
            ...(patch.purchasedApprox ? { purchasedAt: estimatePurchasedAt(patch.purchasedApprox) } : {}),
          },
    ),
  }));
}

// ───── 着用回数（「これを着る」の記録 ＋ 詳細画面の「今日着た」。同じ日は1回） ─────
export function wearDates(d: AppData, itemId: string): string[] {
  const set = new Set<string>();
  for (const [date, ids] of Object.entries(d.wearLogs)) if (ids.includes(itemId)) set.add(date);
  for (const date of d.items.find((i) => i.id === itemId)?.manualWears ?? []) set.add(date);
  return [...set].sort();
}

export const wearCount = (d: AppData, itemId: string) => wearDates(d, itemId).length;

/** 詳細画面の「今日着た」: 押すと記録、もう一度押すと取り消し */
export function toggleManualWear(itemId: string, date: string) {
  update((d) => ({
    ...d,
    items: d.items.map((i) => {
      if (i.id !== itemId) return i;
      const has = i.manualWears.includes(date);
      return { ...i, manualWears: has ? i.manualWears.filter((x) => x !== date) : [...i.manualWears, date], lastWornAt: has ? i.lastWornAt : date };
    }),
  }));
}

const SAMPLE_PURCHASE: PurchaseApprox[] = ["1y", "this_year", "2_3y", "older", "this_year", "older", "1y", "2_3y", "1y", "this_year", "2_3y", "1y", "older"];

export function addSampleWardrobe() {
  SAMPLE_WARDROBE.forEach((s, idx) => {
    addItem({
      purchasedApprox: SAMPLE_PURCHASE[idx] ?? "unknown",
      hasPhoto: false,
      brandName: s.brand ?? "",
      name: s.name,
      category: s.category,
      subCategory: s.sub,
      color: s.color,
      fit: s.fit,
      materials: s.materials,
      careSymbols: s.care,
      size: null,
    });
  });
}

export function logWear(date: string, itemIds: string[]) {
  update((d) => ({
    ...d,
    wearLogs: { ...d.wearLogs, [date]: itemIds },
    items: d.items.map((i) => (itemIds.includes(i.id) ? { ...i, lastWornAt: date } : i)),
  }));
}

// ───── シーン・プラン ─────
export const listScenes = (): Scene[] => SCENES.map((s) => ({ ...s, notes: s.notes ?? null }));

export function getDayPlanOrLatest(d: AppData, date: string): { plan: DayPlan; inherited: boolean } {
  if (d.plans[date]) return { plan: { date, slots: d.plans[date] }, inherited: false };
  const latest = Object.keys(d.plans)
    .filter((k) => k < date)
    .sort()
    .at(-1);
  if (latest) return { plan: { date, slots: d.plans[latest] }, inherited: true };
  return { plan: { date, slots: { MORNING: "university", NOON: "university", EVENING: "shopping", NIGHT: "home" } }, inherited: true };
}

export function saveDayPlan(plan: DayPlan) {
  update((d) => ({ ...d, plans: { ...d.plans, [plan.date]: plan.slots } }));
}

// ───── 疑似カタログ（楽天に接続できないときの予備） ─────
let catalogCache: CatalogProduct[] | null = null;
export function listCatalog(category: Category, maxPrice: number): CatalogProduct[] {
  catalogCache ??= buildCatalog().map((p, i) => ({
    id: `catalog:${i}`,
    brandId: `seed:${p.brand}`,
    brandName: p.brand,
    category: p.category,
    subCategory: p.sub,
    name: p.name,
    price: p.price,
    color: p.color,
    warmth: p.warmth,
    formality: p.formality,
    url: `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(`${p.brand} ${p.name}`)}/`,
  }));
  return catalogCache.filter((p) => p.category === category && p.price <= maxPrice).sort((a, b) => a.price - b.price);
}

// ───── バックアップ ─────
export async function exportData(): Promise<string> {
  const photos = await allPhotos().catch(() => ({}));
  return JSON.stringify({ ...read(), photos });
}

const ImportSchema = z.object({
  version: z.number(),
  user: z.object({ onboarded: z.boolean() }).passthrough(),
  items: z.array(z.object({ id: z.string(), category: z.enum(CATEGORIES) }).passthrough()),
  customBrands: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()).default([]),
  plans: z.record(z.string(), z.object(Object.fromEntries(PERIODS.map((p) => [p, z.string().nullable()])))).default({}),
  wearLogs: z.record(z.string(), z.array(z.string())).default({}),
  photos: z.record(z.string(), z.string().startsWith("data:image/")).default({}),
});

/** 書き出したデータを読み込む（今のデータは置き換わる） */
export async function importData(json: string): Promise<{ ok: true; items: number } | { ok: false; error: string }> {
  try {
    const parsed = ImportSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return { ok: false, error: "このアプリで書き出したファイルではないようです" };
    const { photos, ...rest } = parsed.data;
    const next = migrate(rest as unknown as AppData);
    await replaceAllPhotos(photos);
    write(next);
    return { ok: true, items: next.items.length };
  } catch {
    return { ok: false, error: "ファイルを読み込めませんでした" };
  }
}

export function resetAll() {
  write(defaultData());
  replaceAllPhotos({}).catch(() => undefined);
}
