import { subCategoryById, type Category } from "../constants";
import { budgetFor, rankProducts, type Gap, type ProductCandidate, type ShopContext, type Suggestion } from "../engine/shopping";
import { listCatalog } from "../store";
import type { Brand } from "../types";
import { isRakutenError, rakutenEnabled, searchRakuten, type RakutenItem } from "./rakuten";

// 検索キーワードにするときの言い換え（通販でよく使われる言葉に寄せる）
const SEARCH_WORD: Record<string, string> = {
  longsleeve: "ロングスリーブTシャツ",
  shirt: "シャツ 長袖",
  knit: "ニット セーター",
  hoodie: "パーカー",
  slacks: "スラックス",
  wide: "ワイドパンツ",
  cardigan: "カーディガン",
  shirt_jacket: "シャツジャケット",
  tailored: "テーラードジャケット",
  mountain_parka: "マウンテンパーカー",
  coat: "コート",
  down: "ダウンジャケット",
  sneakers: "スニーカー",
  leather: "革靴 ビジネスシューズ",
  loafer: "ローファー",
  rain_shoes: "防水 スニーカー",
  boots: "ブーツ 防水",
};

// 楽天のジャンルID（メンズファッション / レディースファッション / 靴 / バッグ・小物）
const GENRE = { mens: 551177, womens: 100371, shoes: 558885, bag: 216131 } as const;
const NG = "キッズ ベビー 子供 ジュニア 中古 USED 福袋 セット販売 まとめ買い";

const COLOR_WORDS: [string, RegExp][] = [
  ["black", /ブラック|黒|black/i],
  ["white", /ホワイト|白|アイボリー|white/i],
  ["gray", /グレー|グレイ|チャコール|gray|grey/i],
  ["navy", /ネイビー|紺|navy/i],
  ["beige", /ベージュ|エクリュ|オートミール|beige/i],
  ["brown", /ブラウン|茶|キャメル|モカ|brown/i],
  ["khaki", /カーキ|オリーブ|khaki|olive/i],
  ["green", /グリーン|緑|green/i],
  ["blue", /ブルー|青|インディゴ|blue/i],
  ["lightblue", /サックス|水色|ライトブルー/i],
  ["red", /レッド|赤|ボルドー|red/i],
  ["pink", /ピンク|pink/i],
  ["yellow", /イエロー|黄|マスタード|yellow/i],
  ["orange", /オレンジ|テラコッタ|orange/i],
  ["purple", /パープル|紫|ラベンダー|purple/i],
];

/** 商品名に1色だけ書かれていればその色、カラバリ商品なら null */
function detectColor(name: string): string | null {
  const found = COLOR_WORDS.filter(([, re]) => re.test(name)).map(([id]) => id);
  return found.length === 1 ? found[0] : null;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s・.'’\-_&]/g, "");

/** 商品名・ショップ名からブランドマスタを引く（長い名前を優先） */
function matchBrand(item: RakutenItem, brands: Brand[]): Brand | null {
  const hay = norm(`${item.itemName} ${item.shopName}`);
  let best: { b: Brand; len: number } | null = null;
  for (const b of brands) {
    for (const n of [b.name, ...b.aliases]) {
      const k = norm(n);
      if (k.length >= 2 && hay.includes(k) && (!best || k.length > best.len)) best = { b, len: k.length };
    }
  }
  return best?.b ?? null;
}

function keywordFor(gap: Gap, section: ShopContext["user"]["style"]["shopSection"]): string {
  const sub = gap.subHints[0];
  const word = (sub && SEARCH_WORD[sub]) ?? subCategoryById(sub ?? "")?.label ?? "";
  const who = section === "mens" ? "メンズ" : section === "womens" ? "レディース" : "";
  return [word, who].filter(Boolean).join(" ");
}

function genreFor(category: Category, section: ShopContext["user"]["style"]["shopSection"]): number | undefined {
  if (category === "SHOES") return GENRE.shoes;
  if (category === "BAG") return GENRE.bag;
  if (section === "mens") return GENRE.mens;
  if (section === "womens") return GENRE.womens;
  return undefined;
}

async function rakutenCandidates(gap: Gap, s: ShopContext): Promise<ProductCandidate[]> {
  const budget = budgetFor(s.user, gap.category);
  const base = { keyword: keywordFor(gap, s.user.style.shopSection), maxPrice: budget, minPrice: Math.round(budget * 0.2), ngKeyword: NG };
  const genreId = genreFor(gap.category, s.user.style.shopSection);
  let items: RakutenItem[] = [];
  try {
    items = await searchRakuten({ ...base, genreId });
  } catch (e) {
    // ジャンル指定が原因のパラメータエラーなら、ジャンルなしでやり直す
    if (!(genreId && isRakutenError(e) && e.status === 400)) throw e;
  }
  // ジャンルで絞って0件なら、ジャンルなしで再検索
  if (!items.length && genreId) items = await searchRakuten(base);

  return items.map((it) => {
    const brand = matchBrand(it, s.brands);
    return {
      id: `rakuten:${it.itemCode}`,
      source: "rakuten" as const,
      brandId: brand?.id ?? null,
      brandName: brand?.name ?? null,
      name: it.itemName,
      price: it.itemPrice,
      color: detectColor(it.itemName),
      imageUrl: it.mediumImageUrls[0]?.replace(/\?_ex=\d+x\d+/, "?_ex=300x300") ?? null,
      url: it.affiliateUrl || it.itemUrl,
      shopName: it.shopName,
      rating: it.reviewCount ? { avg: it.reviewAverage, count: it.reviewCount } : null,
    };
  });
}

function catalogCandidates(gap: Gap, s: ShopContext): ProductCandidate[] {
  const all = listCatalog(gap.category, budgetFor(s.user, gap.category)).filter(
    (p) => p.warmth >= gap.minWarmth && p.formality >= gap.minFormality - 10,
  );
  const narrowed = all.filter((p) => gap.subHints.includes(p.subCategory));
  return (narrowed.length ? narrowed : all).map((p) => ({
    id: p.id,
    source: "catalog" as const,
    brandId: p.brandId,
    brandName: p.brandName,
    name: p.name,
    price: p.price,
    color: p.color,
    imageUrl: null,
    url: p.url,
    shopName: null,
    rating: null,
  }));
}

/** 不足アイテムごとに買い足し候補を探す。楽天のキーがあれば実商品、なければ疑似カタログ */
export async function getSuggestions(gaps: Gap[], s: ShopContext): Promise<Suggestion[]> {
  const useRakuten = rakutenEnabled();
  const out: Suggestion[] = [];
  for (const gap of gaps) {
    const budget = budgetFor(s.user, gap.category);
    if (useRakuten) {
      try {
        out.push({ gap, budget, source: "rakuten", products: rankProducts(gap, await rakutenCandidates(gap, s), s) });
        continue;
      } catch (e) {
        console.warn("[shop] rakuten", e);
        const error = isRakutenError(e) ? e.message : "楽天の商品を取得できませんでした";
        out.push({ gap, budget, source: "catalog", error, products: rankProducts(gap, catalogCandidates(gap, s), s) });
        continue;
      }
    }
    out.push({ gap, budget, source: "catalog", products: rankProducts(gap, catalogCandidates(gap, s), s) });
  }
  return out;
}
