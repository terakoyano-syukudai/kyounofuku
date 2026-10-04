"use client";

import Link from "next/link";
import { Loading } from "@/components/Loading";
import { SampleButton } from "@/components/SampleButton";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { ItemThumb, LifeMeter } from "@/components/wardrobe/ItemVisual";
import { CATEGORIES, CATEGORY_LABEL, colorById, subCategoryById, yen } from "@/lib/constants";
import { buildBrandProfile } from "@/lib/engine/brand-profile";
import { lifeInfo, type LifeInfo } from "@/lib/engine/lifespan";
import { allBrands, listItems, useAppData, wearCount } from "@/lib/store";
import type { WardrobeItem } from "@/lib/types";
import { todayISO } from "@/lib/weather";

/** 楽天で同じ種類の服を予算内で探すリンク（APIを使わない検索ページ） */
function rakutenSearchUrl(item: WardrobeItem, section: string, budget: number) {
  const who = section === "mens" ? "メンズ" : section === "womens" ? "レディース" : "";
  const kw = [subCategoryById(item.subCategory)?.label, colorById(item.color).label, who].filter(Boolean).join(" ");
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(kw)}/?max=${budget}`;
}

export default function WardrobePage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const today = todayISO();
  const items = listItems(data);
  const profile = buildBrandProfile(items, allBrands(data));
  const lives = new Map<string, LifeInfo>(items.map((i) => [i.id, lifeInfo(i, wearCount(data, i.id), today)]));
  const replace = items.filter((i) => lives.get(i.id)!.status !== "ok").sort((a, b) => lives.get(b.id)!.used - lives.get(a.id)!.used);

  return (
    <div>
      <PageHeader title="クローゼット" description={`登録した服は${items.length}着です。服をタップすると、着た回数や購入時期を見られます。`} />

      <Link href="/wardrobe/add/" className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-bold text-accent-ink shadow-sm">
        ＋ 服を登録する（写真・タグ）
      </Link>

      {items.length === 0 && (
        <Card className="mt-4 space-y-3 text-center">
          <p className="text-base">まだ服が登録されていません</p>
          <SampleButton />
        </Card>
      )}

      {/* 買い替えのおすすめ */}
      {replace.length > 0 && (
        <>
          <SectionTitle icon="🔁" description="着た回数か購入からの年数が、種類ごとの目安に近づいた服です">
            そろそろ買い替え（{replace.length}着）
          </SectionTitle>
          <ul className="space-y-3">
            {replace.map((i) => {
              const life = lives.get(i.id)!;
              const budget = data.user.budgets[i.category] ?? 10000;
              return (
                <li key={i.id}>
                  <Card className="p-3">
                    <Link href={`/wardrobe/item/?id=${i.id}`} className="flex gap-3">
                      <div className="w-20 shrink-0 overflow-hidden rounded-xl">
                        <ItemThumb item={i} className="h-20" label={false} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-base font-bold leading-snug">
                          {colorById(i.color).label}の{subCategoryById(i.subCategory)?.label}
                        </p>
                        <p className="text-sm text-muted">{i.brandName ?? "ブランド不明"}</p>
                        <div className="mt-1">
                          <LifeMeter life={life} />
                        </div>
                      </div>
                    </Link>
                    <a
                      href={rakutenSearchUrl(i, data.user.style.shopSection, budget)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex min-h-12 items-center justify-center rounded-2xl border-2 border-line text-base font-bold"
                    >
                      🔍 楽天で探す（{yen(budget)}まで）
                    </a>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* カテゴリごとの一覧 */}
      {CATEGORIES.map((cat) => {
        const list = items.filter((i) => i.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <SectionTitle>
              {CATEGORY_LABEL[cat]}（{list.length}）
            </SectionTitle>
            <ul className="space-y-2">
              {list.map((i) => {
                const life = lives.get(i.id)!;
                return (
                  <li key={i.id}>
                    <Link href={`/wardrobe/item/?id=${i.id}`} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-2.5">
                      <div className="w-20 shrink-0 overflow-hidden rounded-xl">
                        <ItemThumb item={i} className="h-20" label={false} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-base font-bold leading-snug">
                          {colorById(i.color).label}の{subCategoryById(i.subCategory)?.label}
                        </p>
                        <p className="text-sm leading-snug text-muted">
                          {[i.brandName ?? "ブランド不明", i.name].filter(Boolean).join("・")}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="shrink-0 text-sm font-bold">着用{life.wearCount}回</span>
                          <div className="min-w-0 flex-1">
                            <LifeMeter life={life} compact />
                          </div>
                        </div>
                      </div>
                      <span aria-hidden className="text-xl text-muted">
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {/* ブランドの自動学習の結果 */}
      {items.length > 0 && (
        <>
          <SectionTitle icon="📊" description="登録した服のブランドから、好みの価格帯やテイストを推定しています">
            あなたの傾向
          </SectionTitle>
          <Card>
            {profile.brandedCount === 0 ? (
              <p className="text-base text-muted">ブランドのわかる服を登録すると表示されます。</p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-base">
                <div className="col-span-2">
                  <dt className="text-sm text-muted">価格帯</dt>
                  <dd className="font-bold">
                    {profile.tierLabel}
                    <span className="ml-2 text-sm font-normal text-muted">1着 {profile.priceRange}</span>
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-muted">客層</dt>
                  <dd className="font-bold">{profile.ageBand}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-muted">テイスト</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {profile.topTastes.map((t) => (
                      <span key={t.id} className="rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
                        {t.label} {Math.round(t.score * 100)}%
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm text-muted">よく着るブランド</dt>
                  <dd className="text-sm">{profile.topBrands.map((b) => `${b.name}(${b.count})`).join("・")}</dd>
                </div>
              </dl>
            )}
          </Card>
          <Link href="/wardrobe/accuracy/" className="mt-3 flex min-h-12 items-center justify-between rounded-2xl border-2 border-line bg-surface px-4 text-base font-bold">
            <span>🎯 タグ読み取りの精度を見る</span>
            <span aria-hidden>›</span>
          </Link>
        </>
      )}
    </div>
  );
}
