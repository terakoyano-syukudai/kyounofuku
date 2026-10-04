"use client";

import { useEffect, useState } from "react";
import { CATEGORY_LABEL, colorById, yen } from "@/lib/constants";
import type { Gap, ShopContext, Suggestion } from "@/lib/engine/shopping";
import { getSuggestions } from "@/lib/shop";
import { Card, Notice } from "../ui";

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

  if (!gaps.length) return null;
  if (!result || result.key !== cacheKey) return <ShoppingSkeleton />;
  const { suggestions } = result;
  const source = suggestions.some((s) => s.source === "rakuten") ? "rakuten" : suggestions.some((s) => s.error) ? "fallback" : "catalog";

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <Card key={s.gap.category + s.gap.reason}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-black">{CATEGORY_LABEL[s.gap.category]}</h3>
            <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-sm font-bold">予算 {yen(s.budget)} まで</span>
          </div>
          <p className="mt-1 text-base">
            <b>なぜ必要？</b> {s.gap.reason}
          </p>
          {s.error && (
            <div className="mt-2">
              <Notice tone="warn">{s.error}（代わりにサンプルカタログを表示中）</Notice>
            </div>
          )}
          {s.products.length === 0 ? (
            <div className="mt-3">
              <Notice>予算内で条件に合う商品が見つかりませんでした。設定で{CATEGORY_LABEL[s.gap.category]}の予算を見直してみてください。</Notice>
            </div>
          ) : (
            <ul className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {s.products.map((p) => {
                const c = p.color ? colorById(p.color) : null;
                return (
                  <li key={p.id} className="flex w-48 shrink-0 snap-start flex-col rounded-2xl border-2 border-line p-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" loading="lazy" className="mb-2 aspect-square w-full rounded-xl bg-white object-contain" />
                    ) : (
                      <div className="mb-2 h-16 rounded-xl" style={{ background: c?.hex ?? "var(--surface-2)", boxShadow: "0 0 0 1px rgb(0 0 0 / 0.1) inset" }} />
                    )}
                    <div className="truncate text-sm text-muted">{p.brandName ?? p.shopName}</div>
                    <div className="line-clamp-2 text-base font-bold leading-snug">
                      {p.name}
                      {p.source === "catalog" && c ? `（${c.label}）` : ""}
                    </div>
                    <div className="mt-1 text-lg font-black tabular-nums text-accent">{yen(p.price)}</div>
                    <div className="mt-1 text-sm leading-snug">
                      <b>選んだ理由：</b>
                      {p.why}
                    </div>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="mt-auto flex min-h-11 items-center justify-center rounded-xl border-2 border-accent pt-0 text-sm font-bold text-accent"
                        style={{ marginTop: "0.75rem" }}
                      >
                        {p.source === "rakuten" ? "楽天で見る ↗" : "探してみる ↗"}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}
      <p className="px-1 text-sm text-muted">
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
      <p className="mt-3 text-base text-muted">⏳ 予算に合う商品を楽天で探しています…</p>
    </Card>
  );
}
