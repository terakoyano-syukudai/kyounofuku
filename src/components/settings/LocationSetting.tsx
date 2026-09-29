"use client";

import { useSyncExternalStore, useState, useTransition } from "react";
import { saveLocation } from "@/lib/store";
import { searchArea } from "@/lib/weather";
import { Button } from "../ui";

type Geo = { name: string; admin: string; lat: number; lon: number };

export function LocationSetting({ current }: { current: string | null }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Geo[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // 位置情報は https か localhost でしか使えない（サーバーでは判定できないので true 扱い）
  const secure = useSyncExternalStore(
    () => () => {},
    () => window.isSecureContext,
    () => true,
  );

  const useGps = () => {
    if (!navigator.geolocation) return setMsg("この端末では位置情報が使えません");
    setMsg("現在地を取得中…");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        start(async () => {
          saveLocation("現在地", Math.round(pos.coords.latitude * 100) / 100, Math.round(pos.coords.longitude * 100) / 100);
          setMsg("現在地を設定しました");
        }),
      () => setMsg("位置情報を取得できませんでした。エリア名で検索してください"),
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  return (
    <div>
      <div className="text-sm">
        現在のエリア: <b>{current ?? "未設定"}</b>
      </div>
      {secure ? (
        <Button variant="ghost" className="mt-3 w-full" onClick={useGps} disabled={pending}>
          📍 現在地を使う
        </Button>
      ) : (
        <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-muted">この接続では現在地を取得できません。下の検索でエリアを選んでください。</p>
      )}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const query = q.trim().slice(0, 40);
          if (query) start(async () => setResults(await searchArea(query).catch(() => [])));
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="エリア名（例: 渋谷、札幌）"
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2.5 text-base"
        />
        <Button variant="ghost" type="submit" disabled={pending || !q.trim()}>
          検索
        </Button>
      </form>
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm"
                onClick={() =>
                  start(async () => {
                    saveLocation(r.name, r.lat, r.lon);
                    setResults([]);
                    setMsg(`${r.name} に設定しました`);
                  })
                }
              >
                {r.name} <span className="text-xs text-muted">{r.admin}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
