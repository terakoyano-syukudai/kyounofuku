"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { SampleButton } from "@/components/SampleButton";
import { Card, SectionTitle, inkOn } from "@/components/ui";
import { CATEGORIES, CATEGORY_LABEL, colorById, subCategoryById } from "@/lib/constants";
import { buildBrandProfile } from "@/lib/engine/brand-profile";
import { allBrands, listItems, useAppData } from "@/lib/store";

export default function WardrobePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Wardrobe />
    </Suspense>
  );
}

function Wardrobe() {
  const data = useAppData();
  const sp = useSearchParams();
  if (!data) return <Loading />;
  const items = listItems(data);
  const profile = buildBrandProfile(items, allBrands(data));

  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-black">クローゼット</h1>
        <span className="text-sm text-muted">{items.length}着</span>
      </div>
      {sp.get("added") && <div className="mt-3 rounded-2xl bg-good/15 px-4 py-2.5 text-sm font-bold text-good">✓ 登録しました</div>}

      {/* ブランドの自動学習の結果 */}
      <Card className="mt-3">
        <div className="text-xs font-bold text-muted">手持ちから推定したあなたの傾向</div>
        {profile.brandedCount === 0 ? (
          <p className="mt-2 text-sm text-muted">ブランドのわかる服を登録すると、好みの価格帯やテイストを自動で推定します。</p>
        ) : (
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt className="text-[11px] text-muted">価格帯</dt>
              <dd className="font-bold">{profile.tierLabel}</dd>
              <dd className="text-[11px] text-muted">1着 {profile.priceRange}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">客層</dt>
              <dd className="font-bold">{profile.ageBand}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] text-muted">テイスト</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {profile.topTastes.map((t) => (
                  <span key={t.id} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                    {t.label} {Math.round(t.score * 100)}%
                  </span>
                ))}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] text-muted">よく着るブランド</dt>
              <dd className="text-xs">{profile.topBrands.map((b) => `${b.name}(${b.count})`).join("・")}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Link href="/wardrobe/accuracy" className="mt-2 flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm">
        <span>🎯 タグ読み取りの精度を見る</span>
        <span className="text-muted">›</span>
      </Link>

      {items.length === 0 && (
        <Card className="mt-3 space-y-2 text-center">
          <p className="text-sm text-muted">まだ服が登録されていません</p>
          <SampleButton />
        </Card>
      )}

      {CATEGORIES.map((cat) => {
        const list = items.filter((i) => i.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <SectionTitle>
              {CATEGORY_LABEL[cat]}（{list.length}）
            </SectionTitle>
            <ul className="grid grid-cols-3 gap-2">
              {list.map((i) => {
                const c = colorById(i.color);
                return (
                  <li key={i.id}>
                    <Link href={`/wardrobe/item?id=${i.id}`} className="block overflow-hidden rounded-2xl border border-line bg-surface">
                      <div
                        className="flex h-20 items-end p-2 text-[11px] font-bold"
                        style={{ background: c.hex, color: inkOn(c.hex), boxShadow: "0 -1px 0 rgb(0 0 0 / 0.06) inset" }}
                      >
                        {subCategoryById(i.subCategory)?.label}
                      </div>
                      <div className="p-2">
                        <div className="truncate text-[11px] text-muted">{i.brandName ?? "ブランド不明"}</div>
                        <div className="truncate text-xs font-bold">{i.name ?? c.label}</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <Link
        href="/wardrobe/add"
        className="fixed bottom-24 right-[max(1rem,calc(50%-14rem+1rem))] z-20 flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-bold text-accent-ink shadow-lg"
      >
        📷 タグを撮って追加
      </Link>
    </div>
  );
}
