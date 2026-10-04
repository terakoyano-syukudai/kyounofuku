"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { Loading } from "@/components/Loading";
import { Button, Card, Chip, PageHeader, SectionTitle } from "@/components/ui";
import { ItemThumb, LifeMeter } from "@/components/wardrobe/ItemVisual";
import { CATEGORY_LABEL, FITS, careById, colorById, subCategoryById } from "@/lib/constants";
import { lifeInfo } from "@/lib/engine/lifespan";
import { resizeImage, savePhoto } from "@/lib/photo";
import { deleteItem, listItems, toggleManualWear, updateItem, useAppData, wearDates } from "@/lib/store";
import { toast } from "@/lib/toast";
import { PURCHASE_APPROX } from "@/lib/types";
import { todayISO } from "@/lib/weather";

const dots = (n: number, max = 5) => "●".repeat(Math.max(0, n)) + "○".repeat(Math.max(0, max - n));
const fmt = (iso: string) => new Date(`${iso}T00:00:00+09:00`).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });

// 静的サイトでは動的ルートを使えないので、/wardrobe/item/?id=... で1着を表示する
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
  const photoInput = useRef<HTMLInputElement>(null);
  if (!data) return <Loading />;
  const item = listItems(data).find((i) => i.id === sp.get("id"));
  if (!item) {
    return (
      <div className="py-10 text-center text-base">
        この服は見つかりませんでした。
        <Link href="/wardrobe/" className="mt-4 flex min-h-12 items-center justify-center rounded-2xl border-2 border-line font-bold">
          クローゼットに戻る
        </Link>
      </div>
    );
  }
  const today = todayISO();
  const c = colorById(item.color);
  const dates = wearDates(data, item.id);
  const life = lifeInfo(item, dates.length, today);
  const wornToday = dates.includes(today);
  const manualToday = item.manualWears.includes(today);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    const { dataUrl } = await resizeImage(file, 720);
    await savePhoto(item.id, dataUrl);
    updateItem(item.id, { hasPhoto: true });
    toast("写真を保存しました");
  };

  return (
    <div>
      <PageHeader
        title={item.name ?? `${c.label}の${subCategoryById(item.subCategory)?.label}`}
        description={item.brandName ?? "ブランド不明"}
        back={{ href: "/wardrobe/", label: "クローゼット" }}
      />

      <div className="overflow-hidden rounded-3xl border-2 border-line">
        <ItemThumb item={item} className="h-64" />
      </div>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => photoInput.current?.click()}>
        📷 {item.hasPhoto ? "写真を撮り直す" : "服の写真を追加"}
      </Button>
      <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (onPhoto(e.target.files?.[0]), (e.target.value = ""))} />

      {/* 着用と買い替え */}
      <SectionTitle icon="🔁" description="「これを着る」とこの画面の「今日着た」で数えます（同じ日は1回）">
        着た回数と買い替え目安
      </SectionTitle>
      <Card className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tabular-nums">{dates.length}</span>
          <span className="text-base">回着用</span>
          {dates.length > 0 && <span className="ml-auto text-sm text-muted">最後: {fmt(dates[dates.length - 1])}</span>}
        </div>
        <Button
          variant={wornToday ? "ghost" : "primary"}
          className="w-full !min-h-14 text-lg"
          disabled={wornToday && !manualToday}
          onClick={() => {
            toggleManualWear(item.id, today);
            toast(manualToday ? "今日の記録を取り消しました" : "今日着た記録をつけました", manualToday ? "info" : "success");
          }}
        >
          {wornToday ? (manualToday ? "✓ 今日着た（タップで取り消し）" : "✓ 今日のコーデで記録済み") : "👕 今日着た"}
        </Button>
        <LifeMeter life={life} />
        <div>
          <p className="mb-2 text-base font-bold">購入した時期</p>
          <div className="flex flex-wrap gap-2">
            {PURCHASE_APPROX.map((p) => (
              <Chip
                key={p.id}
                active={item.purchasedApprox === p.id}
                onClick={() => {
                  updateItem(item.id, { purchasedApprox: p.id });
                  toast(`購入時期を「${p.label}」にしました`);
                }}
              >
                {p.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            目安: {life.expected.wears}回 または {life.expected.years}年（{subCategoryById(item.subCategory)?.label}・素材を考慮）
          </p>
        </div>
      </Card>

      {/* 詳細 */}
      <SectionTitle icon="🏷️">タグの情報</SectionTitle>
      <Card>
        <dl className="grid grid-cols-2 gap-4 text-base">
          <div>
            <dt className="text-sm text-muted">カテゴリ</dt>
            <dd className="font-bold">
              {CATEGORY_LABEL[item.category]} / {subCategoryById(item.subCategory)?.label}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">色・サイズ感</dt>
            <dd className="font-bold">
              {c.label} / {FITS.find((f) => f.id === item.fit)?.label}
              {item.size ? ` / ${item.size}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">保温性</dt>
            <dd className="tracking-widest text-accent">{dots(item.warmth)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">通気性</dt>
            <dd className="tracking-widest text-accent">{dots(item.breathability)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-muted">素材</dt>
            <dd>{item.materials.length ? item.materials.map((m) => `${m.name} ${m.pct}%`).join("・") : "未登録"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-muted">洗濯表示</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {item.careSymbols.length
                ? item.careSymbols.map((s) => (
                    <span key={s} className="rounded-lg bg-surface-2 px-2.5 py-1 text-sm">
                      {careById(s)?.label ?? s}
                    </span>
                  ))
                : "未登録"}
            </dd>
          </div>
        </dl>
      </Card>

      {confirming ? (
        <div className="mt-8 space-y-2">
          <p className="text-center text-base font-bold">この服を削除しますか？（元に戻せません）</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              やめる
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteItem(item.id);
                toast("削除しました", "info");
                router.push("/wardrobe/");
              }}
            >
              削除する
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" className="mt-8 w-full" onClick={() => setConfirming(true)}>
          この服を削除
        </Button>
      )}
    </div>
  );
}
