"use client";

import { useEffect, useState } from "react";
import { CATEGORY_LABEL, colorById, yen } from "@/lib/constants";
import type { Gap, ShopContext, Suggestion } from "@/lib/engine/shopping";
import { getSuggestions } from "@/lib/shop";
import { Card } from "../ui";

/** 商品検索は時間がかかることがあるので、コーデを先に表示してから読み込む */
export function ShoppingSuggestions({ gaps, shop, cacheKey }: { gaps: Gap[]; shop: ShopContext; cacheKey: string }) {
  const [result, setResult] = useState<{ key: string; suggestions: Suggestion[] } | null>(null);

  useEffect(() => {
    if (!gaps.length) return;
    let alive = true;
    getSuggestions(gaps, shop).then((suggestions) => alive && setResult({ key: cacheKey, suggestions }));
    return () => {
      alive = false;
    };
    // cacheKey が変わったとき（日付・案・手持ち服の変更）だけ検索し直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  if (!gaps.length) {
    return <Card className="text-sm text-muted">今日は手持ちで十分です。買い足しは必要ありません 👍</Card>;
  }
  if (!result || result.key !== cacheKey) return <ShoppingSkeleton />;
  const { suggestions } = result;
  const source = suggestions.some((s) => s.source === "rakuten") ? "rakuten" : suggestions.some((s) => s.error) ? "fallback" : "catalog";

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <Card key={s.gap.category + s.gap.reason}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold">{CATEGORY_LABEL[s.gap.category]}</h3>
            <span className="shrink-0 text-xs text-muted">予算 {yen(s.budget)} 以内</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{s.gap.reason}</p>
          {s.error && <p className="mt-2 rounded-xl bg-warn/15 px-3 py-2 text-[11px] text-warn">{s.error}（サンプルカタログを表示中）</p>}
          {s.products.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-xs">
              予算内で条件に合う商品が見つかりませんでした。設定で{CATEGORY_LABEL[s.gap.category]}の予算を見直してみてください。
            </p>
          ) : (
            <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
              {s.products.map((p) => {
                const c = p.color ? colorById(p.color) : null;
                return (
                  <li key={p.id} className="w-40 shrink-0 rounded-2xl border border-line p-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" loading="lazy" className="mb-2 aspect-square w-full rounded-xl bg-white object-contain" />
                    ) : (
                      <div className="mb-2 h-14 rounded-xl" style={{ background: c?.hex ?? "var(--surface-2)", boxShadow: "0 0 0 1px rgb(0 0 0 / 0.08) inset" }} />
                    )}
                    <div className="truncate text-[11px] text-muted">{p.brandName ?? p.shopName}</div>
                    <div className="line-clamp-2 text-[13px] font-bold leading-snug">
                      {p.name}
                      {p.source === "catalog" && c ? `（${c.label}）` : ""}
                    </div>
                    <div className="mt-1 text-sm font-bold tabular-nums text-accent">{yen(p.price)}</div>
                    <div className="mt-1 text-[11px] leading-snug text-muted">{p.why}</div>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer sponsored" className="mt-2 block text-center text-[11px] font-bold text-accent underline">
                        {p.source === "rakuten" ? "楽天で見る" : "探してみる"}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}
      <p className="px-1 text-[10px] text-muted">
        {source === "rakuten"
          ? "商品情報: 楽天市場（Supported by Rakuten Developers）"
          : source === "fallback"
            ? "楽天に接続できなかったため、サンプルカタログから提案しています"
            : "サンプルカタログから提案しています（楽天APIキーを設定すると実際の商品を検索します）"}
      </p>
    </div>
  );
}

export function ShoppingSkeleton() {
  return (
    <Card>
      <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 w-40 shrink-0 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">予算に合う商品を探しています…</p>
    </Card>
  );
}
