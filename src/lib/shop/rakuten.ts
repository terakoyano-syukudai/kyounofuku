// 楽天市場商品検索API (version:2026-07-01) をブラウザから直接呼ぶ
// https://webservice.rakuten.co.jp/documentation/ichiba-item-search
// アプリ種別「Webアプリケーション」で登録し、許可されたWebサイト（公開先のドメイン）からの
// アクセスだけが通る。アクセスキーは公開されたJSに含まれる前提の仕組み。
const ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 1100; // 短時間の連続アクセスは制限されるので1秒以上あける

const APP_ID = process.env.NEXT_PUBLIC_RAKUTEN_APPLICATION_ID ?? "";
const ACCESS_KEY = process.env.NEXT_PUBLIC_RAKUTEN_ACCESS_KEY ?? "";

export type RakutenItem = {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  affiliateUrl?: string;
  mediumImageUrls: string[];
  shopName: string;
  reviewCount: number;
  reviewAverage: number;
};

export class RakutenError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RakutenError";
  }
}

export const isRakutenError = (e: unknown): e is RakutenError => e instanceof Error && e.name === "RakutenError";

export const rakutenEnabled = () => !!(APP_ID && ACCESS_KEY);

const memory = new Map<string, { at: number; items: RakutenItem[] }>();
let queue: Promise<unknown> = Promise.resolve();
let last = 0;
let authError: { at: number; error: RakutenError } | null = null;
const AUTH_ERROR_TTL_MS = 5 * 60 * 1000;

/** 呼び出しを直列化して間隔をあける */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = last + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      last = Date.now();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

function cacheGet(key: string): RakutenItem[] | null {
  const m = memory.get(key);
  if (m && Date.now() - m.at < CACHE_TTL_MS) return m.items;
  try {
    const s = JSON.parse(sessionStorage.getItem(`kyounofuku:rakuten:${key}`) ?? "null") as { at: number; items: RakutenItem[] } | null;
    if (s && Date.now() - s.at < CACHE_TTL_MS) return s.items;
  } catch {
    // 保存領域が使えなくても検索は続ける
  }
  return null;
}

function cacheSet(key: string, items: RakutenItem[]) {
  const v = { at: Date.now(), items };
  memory.set(key, v);
  try {
    sessionStorage.setItem(`kyounofuku:rakuten:${key}`, JSON.stringify(v));
  } catch {
    // 保存できなくても問題なし
  }
}

export async function searchRakuten(params: {
  keyword: string;
  minPrice?: number;
  maxPrice: number;
  genreId?: number;
  ngKeyword?: string;
}): Promise<RakutenItem[]> {
  const cacheKey = JSON.stringify(params);
  const hit = cacheGet(cacheKey);
  if (hit) return hit;
  if (authError && Date.now() - authError.at < AUTH_ERROR_TTL_MS) throw authError.error;

  const q = new URLSearchParams({
    applicationId: APP_ID,
    accessKey: ACCESS_KEY,
    keyword: params.keyword,
    maxPrice: String(params.maxPrice),
    hits: "30",
    imageFlag: "1",
    availability: "1",
    format: "json",
    formatVersion: "2",
    elements: "itemCode,itemName,itemPrice,itemUrl,affiliateUrl,mediumImageUrls,shopName,reviewCount,reviewAverage",
  });
  if (params.minPrice) q.set("minPrice", String(params.minPrice));
  if (params.genreId) q.set("genreId", String(params.genreId));
  if (params.ngKeyword) q.set("NGKeyword", params.ngKeyword);

  const items = await throttled(async () => {
    // ブラウザが Referer（公開先のドメイン）を自動で付け、楽天が「許可されたWebサイト」と照合する
    const res = await fetch(`${ENDPOINT}?${q}`, { signal: AbortSignal.timeout(8000), referrerPolicy: "strict-origin-when-cross-origin" });
    if (res.status === 404) return [] as RakutenItem[]; // 該当なし
    const body = (await res.json().catch(() => ({}))) as {
      Items?: RakutenItem[]; // 実際のレスポンス（formatVersion=2）は大文字の Items
      items?: RakutenItem[];
      error?: string;
      error_description?: string;
      errors?: { errorCode?: number; errorMessage?: string };
    };
    if (!res.ok) {
      const code = body.errors?.errorMessage ?? body.error_description ?? body.error ?? "";
      // 許可されていないサイトからのアクセスは 403（REFERRER_MISSING）か 503（Authentication service error）で返る
      const msg = code.startsWith("REQUEST_CONTEXT_BODY_HTTP_REFERRER") || code === "Authentication service error"
        ? "このサイトは楽天の「許可されたWebサイト」に登録されていません（公開先のアドレスから開いてください）"
        : res.status === 429
          ? "楽天APIの呼び出し回数の上限に達しました。しばらくしてから再表示してください"
          : res.status === 400 || res.status === 401 || res.status === 403
            ? `楽天APIの設定を確認してください（${code || res.status}）`
            : `楽天APIでエラーが発生しました（${res.status}${code ? ` ${code}` : ""}）`;
      const err = new RakutenError(msg, res.status);
      if (res.status === 401 || res.status === 403) authError = { at: Date.now(), error: err };
      throw err;
    }
    authError = null;
    return body.Items ?? body.items ?? [];
  });
  cacheSet(cacheKey, items);
  return items;
}
