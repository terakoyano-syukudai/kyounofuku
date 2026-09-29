"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loading } from "@/components/Loading";
import { Button, Card, inkOn } from "@/components/ui";
import { CATEGORY_LABEL, FITS, careById, colorById, subCategoryById } from "@/lib/constants";
import { deleteItem, listItems, useAppData } from "@/lib/store";

const dots = (n: number, max = 5) => "●".repeat(Math.max(0, n)) + "○".repeat(Math.max(0, max - n));

// 静的サイトでは動的ルートを使えないので、/wardrobe/item?id=... で1着を表示する
export default function ItemPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Item />
    </Suspense>
  );
}

function Item() {
  const data = useAppData();
  const sp = useSearchParams();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  if (!data) return <Loading />;
  const item = listItems(data).find((i) => i.id === sp.get("id"));
  if (!item) {
    return (
      <div className="py-10 text-center text-sm text-muted">
        この服は見つかりませんでした。
        <Link href="/wardrobe" className="mt-3 block font-bold text-accent">
          クローゼットに戻る
        </Link>
      </div>
    );
  }
  const c = colorById(item.color);

  return (
    <div>
      <Link href="/wardrobe" className="px-1 text-sm text-muted">
        ‹ クローゼット
      </Link>
      <div className="mt-3 flex h-40 items-end rounded-3xl p-5" style={{ background: c.hex, color: inkOn(c.hex) }}>
        <div>
          <div className="text-sm opacity-80">{item.brandName ?? "ブランド不明"}</div>
          <div className="text-2xl font-black">{item.name ?? subCategoryById(item.subCategory)?.label}</div>
        </div>
      </div>

      <Card className="mt-3">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] text-muted">カテゴリ</dt>
            <dd className="font-bold">
              {CATEGORY_LABEL[item.category]} / {subCategoryById(item.subCategory)?.label}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">色・サイズ感</dt>
            <dd className="font-bold">
              {c.label} / {FITS.find((f) => f.id === item.fit)?.label}
              {item.size ? ` / ${item.size}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">保温性</dt>
            <dd className="tracking-widest text-accent">{dots(item.warmth)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">通気性</dt>
            <dd className="tracking-widest text-accent">{dots(item.breathability)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] text-muted">素材</dt>
            <dd>{item.materials.length ? item.materials.map((m) => `${m.name} ${m.pct}%`).join("・") : "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] text-muted">洗濯表示</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {item.careSymbols.length
                ? item.careSymbols.map((s) => (
                    <span key={s} className="rounded-lg bg-surface-2 px-2 py-1 text-xs">
                      {careById(s)?.icon} {careById(s)?.label ?? s}
                    </span>
                  ))
                : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] text-muted">最後に着た日</dt>
            <dd>{item.lastWornAt ?? "記録なし"}</dd>
          </div>
        </dl>
      </Card>

      {confirming ? (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            やめる
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteItem(item.id);
              router.push("/wardrobe");
            }}
          >
            削除する
          </Button>
        </div>
      ) : (
        <Button variant="danger" className="mt-6 w-full" onClick={() => setConfirming(true)}>
          この服を削除
        </Button>
      )}
    </div>
  );
}
