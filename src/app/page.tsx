"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Loading } from "@/components/Loading";
import { SampleButton } from "@/components/SampleButton";
import { OutfitColorBlocks } from "@/components/today/OutfitColorBlocks";
import { ShoppingSuggestions } from "@/components/today/ShoppingSuggestions";
import { TimelineAdvice, WeatherStrip } from "@/components/today/TimelineAdvice";
import { WearButton } from "@/components/today/WearButton";
import { Card, Notice, SectionTitle } from "@/components/ui";
import { proposeDay } from "@/lib/engine";
import { explainOutfit } from "@/lib/engine/advice";
import { outfitItems } from "@/lib/engine/outfit";
import { allBrands, getDayPlanOrLatest, listItems, listScenes, requestPersistence, toUser, useAppData } from "@/lib/store";
import { getDayWeather, todayISO, weatherLabel, type DayWeather } from "@/lib/weather";

export default function TodayPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Today />
    </Suspense>
  );
}

function Today() {
  const data = useAppData();
  const router = useRouter();
  const sp = useSearchParams();
  const [weather, setWeather] = useState<DayWeather | null>(null);

  const today = todayISO();
  const tomorrow = todayISO(1);
  const date = sp.get("date") === tomorrow ? tomorrow : today;
  const alt = Math.max(0, Math.min(2, Number(sp.get("alt") ?? 0) || 0));
  const lat = data?.user.lat ?? 35.68;
  const lon = data?.user.lon ?? 139.77;

  useEffect(() => {
    if (data && !data.user.onboarded) router.replace("/onboarding/");
  }, [data, router]);

  useEffect(() => {
    requestPersistence();
  }, []);

  useEffect(() => {
    let alive = true;
    getDayWeather(lat, lon, date).then((w) => alive && setWeather(w));
    return () => {
      alive = false;
    };
  }, [lat, lon, date]);

  const view = useMemo(() => {
    if (!data || !weather || weather.date !== date) return null;
    const { plan, inherited } = getDayPlanOrLatest(data, date);
    const items = listItems(data);
    const proposal = proposeDay({
      user: toUser(data),
      plan,
      weather,
      scenes: listScenes(),
      items,
      brands: allBrands(data),
      today,
      altIndex: alt,
    });
    return { proposal, items, inherited, reasons: explainOutfit(proposal.ctx, proposal.outfit) };
  }, [data, weather, date, today, alt]);

  if (!data || !data.user.onboarded) return <Loading />;
  if (!view || !weather) return <Loading label="天気を取得しています…" />;

  const { proposal, items, inherited, reasons } = view;
  const ids = outfitItems(proposal.outfit).map((i) => i.id);
  const wornIds = date === today ? data.wearLogs[today] : undefined;
  const worn = !!wornIds && wornIds.length === ids.length && ids.every((id) => wornIds.includes(id));
  const w = weatherLabel(weather.code);
  const dateLabel = new Date(`${date}T00:00:00+09:00`).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });
  const altHref = `/?${new URLSearchParams({ ...(date !== today ? { date } : {}), alt: String((alt + 1) % Math.max(1, proposal.alternatives.length)) })}`;

  return (
    <div>
      {/* 日付・天気・エリア */}
      <header className="px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full border-2 border-line bg-surface p-1" role="tablist" aria-label="日付">
            {[
              { d: today, label: "今日", href: "/" },
              { d: tomorrow, label: "明日", href: `/?date=${tomorrow}` },
            ].map((t) => (
              <Link
                key={t.d}
                href={t.href}
                role="tab"
                aria-selected={date === t.d}
                className={`flex min-h-11 min-w-16 items-center justify-center rounded-full px-4 text-base font-bold ${date === t.d ? "bg-ink text-bg" : "text-muted"}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <Link href="/settings/" className="flex min-h-11 items-center rounded-full border-2 border-line bg-surface px-3 text-sm font-bold">
            📍{data.user.areaName ?? "未設定"}
          </Link>
        </div>
        <p className="mt-3 text-base">
          <b>{dateLabel}</b>　{w.emoji} {w.label}　<b>{Math.round(weather.max)}°</b> / {Math.round(weather.min)}°
          {weather.source === "fallback" && <span className="ml-2 rounded bg-warn/20 px-1.5 text-sm text-warn">推定値</span>}
        </p>
      </header>

      {/* ① 今日のコーデ */}
      <SectionTitle icon="①">{date === today ? "今日" : "明日"}のおすすめコーデ</SectionTitle>
      <Card className="p-5">
        {items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xl font-black leading-tight">まずは手持ちの服を登録しましょう</p>
            <p className="text-base text-muted">服の写真やタグを撮ると、色や素材を自動で入力します。</p>
            <Link href="/wardrobe/add/" className="flex min-h-14 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-ink">
              ＋ 服を登録する
            </Link>
            <SampleButton />
          </div>
        ) : (
          <>
            <p className="text-2xl font-black leading-snug">{proposal.headline}</p>
            <div className="mt-4">
              <OutfitColorBlocks outfit={proposal.outfit} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {date === today ? (
                <WearButton date={today} itemIds={ids} worn={worn} />
              ) : (
                <div className="flex min-h-[52px] items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">明日の予報で提案しています</div>
              )}
              {proposal.alternatives.length > 1 && (
                <Link href={altHref} className="flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-line px-3 text-base font-bold">
                  🔄 別の案 {alt + 1}/{proposal.alternatives.length}
                </Link>
              )}
            </div>
          </>
        )}
      </Card>

      {reasons.length > 0 && (
        <Card className="mt-3">
          <p className="mb-2 text-base font-black">💡 なぜこのコーデ？</p>
          <ul className="space-y-2.5">
            {reasons.map((r) => (
              <li key={r.title} className="flex gap-2.5 text-base leading-relaxed">
                <span aria-hidden className="text-xl leading-6">
                  {r.icon}
                </span>
                <span>
                  <b>{r.title}</b>：{r.text}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ② 1日の流れ */}
      <SectionTitle
        icon="②"
        description={inherited ? "前回の予定を使っています。今日の予定に合わせて変更できます" : "時間帯ごとの気温と、服の調整のしかたです"}
        action={
          <Link href={`/plan/?date=${date}`} className="flex min-h-11 items-center rounded-full border-2 border-accent px-3 text-sm font-bold text-accent">
            予定を変更
          </Link>
        }
      >
        1日の流れ
      </SectionTitle>
      <WeatherStrip advice={proposal.advice} />
      <div className="mt-3">
        <TimelineAdvice advice={proposal.advice} />
      </div>

      {/* ③ 買い足し */}
      {items.length > 0 && (
        <>
          <SectionTitle icon="③" description="手持ちでは足りないものを、予算内で探しました">
            買い足すなら
          </SectionTitle>
          {proposal.gaps.length === 0 && <Notice tone="success">今日は手持ちの服で十分です。買い足しは必要ありません。</Notice>}
          <ShoppingSuggestions
            gaps={proposal.gaps}
            shop={proposal.shop}
            cacheKey={`${date}|${alt}|${ids.join(",")}|${proposal.gaps.map((g) => g.category + g.subHints.join("/")).join(",")}|${JSON.stringify(data.user.budgets)}`}
          />
        </>
      )}
    </div>
  );
}
