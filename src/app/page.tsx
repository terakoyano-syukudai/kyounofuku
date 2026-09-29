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
import { Card, SectionTitle } from "@/components/ui";
import { proposeDay } from "@/lib/engine";
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
    if (data && !data.user.onboarded) router.replace("/onboarding");
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
    return { proposal, items, inherited };
  }, [data, weather, date, today, alt]);

  if (!data || !data.user.onboarded) return <Loading />;
  if (!view || !weather) return <Loading label="天気を取得しています…" />;

  const { proposal, items, inherited } = view;
  const ids = outfitItems(proposal.outfit).map((i) => i.id);
  const wornIds = date === today ? data.wearLogs[today] : undefined;
  const worn = !!wornIds && wornIds.length === ids.length && ids.every((id) => wornIds.includes(id));
  const w = weatherLabel(weather.code);
  const dateLabel = new Date(`${date}T00:00:00+09:00`).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });
  const altHref = `/?${new URLSearchParams({ ...(date !== today ? { date } : {}), alt: String((alt + 1) % Math.max(1, proposal.alternatives.length)) })}`;

  return (
    <div>
      <header className="flex items-center justify-between px-1">
        <div className="flex gap-1 rounded-full bg-surface p-1 text-xs font-bold">
          <Link href="/" className={`rounded-full px-3 py-1.5 ${date === today ? "bg-ink text-bg" : "text-muted"}`}>
            今日
          </Link>
          <Link href={`/?date=${tomorrow}`} className={`rounded-full px-3 py-1.5 ${date === tomorrow ? "bg-ink text-bg" : "text-muted"}`}>
            明日
          </Link>
        </div>
        <Link href="/settings" className="text-xs text-muted">
          📍{data.user.areaName ?? "未設定"}
        </Link>
      </header>

      {/* ── 今日の結論 ── */}
      <Card className="mt-3 p-5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{dateLabel}</span>
          <span>
            {w.emoji} {w.label} {Math.round(weather.max)}° / {Math.round(weather.min)}°
          </span>
          {weather.source === "fallback" && <span className="rounded bg-warn/20 px-1.5 text-warn">推定値</span>}
        </div>
        {items.length === 0 ? (
          <div className="py-4">
            <h1 className="text-2xl font-black leading-tight">まずは手持ちの服を登録しましょう</h1>
            <p className="mt-2 text-sm text-muted">タグを撮るだけで、ブランドや素材を読み取ります。</p>
            <div className="mt-4 grid gap-2">
              <Link href="/wardrobe/add" className="rounded-2xl bg-accent py-3 text-center text-sm font-bold text-accent-ink">
                📷 タグを撮って登録
              </Link>
              <SampleButton />
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-2 text-[22px] font-black leading-snug">{proposal.headline}</h1>
            <div className="mt-4">
              <OutfitColorBlocks outfit={proposal.outfit} />
            </div>
            {proposal.outfit.reasons.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {proposal.outfit.reasons.slice(0, 3).map((r) => (
                  <li key={r} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px]">
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              {date === today ? (
                <WearButton date={today} itemIds={ids} worn={worn} />
              ) : (
                <div className="rounded-2xl bg-surface-2 py-3 text-center text-xs text-muted">明日の予報で提案しています</div>
              )}
              {proposal.alternatives.length > 1 && (
                <Link href={altHref} className="rounded-2xl border border-line px-4 py-3 text-sm font-bold">
                  別の案 {alt + 1}/{proposal.alternatives.length}
                </Link>
              )}
            </div>
          </>
        )}
      </Card>

      <SectionTitle
        action={
          <Link href={`/plan?date=${date}`} className="text-xs font-bold text-accent">
            予定を変更
          </Link>
        }
      >
        1日のタイムライン{inherited && <span className="ml-1 font-normal">（前回の予定を流用中）</span>}
      </SectionTitle>
      <WeatherStrip advice={proposal.advice} />
      <div className="mt-3">
        <TimelineAdvice advice={proposal.advice} />
      </div>

      {items.length > 0 && (
        <>
          <SectionTitle>買い足すなら</SectionTitle>
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
