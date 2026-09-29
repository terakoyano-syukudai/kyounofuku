// Open-Meteo（APIキー不要・ブラウザから直接呼べる）から時間帯別の天気を取得する
import { PERIODS, PERIOD_META, type Period } from "./constants";

export type PeriodWeather = {
  temp: number;
  apparent: number;
  humidity: number;
  precipProb: number;
  code: number;
};

export type DayWeather = {
  source: "open-meteo" | "fallback";
  date: string;
  periods: Record<Period, PeriodWeather>;
  max: number;
  min: number;
  code: number;
};

export const TZ = "Asia/Tokyo";

export function todayISO(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d); // YYYY-MM-DD
}

export function weatherLabel(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "快晴", emoji: "☀️" };
  if (code <= 2) return { label: "晴れ", emoji: "🌤" };
  if (code === 3) return { label: "くもり", emoji: "☁️" };
  if (code <= 48) return { label: "霧", emoji: "🌫" };
  if (code <= 57) return { label: "霧雨", emoji: "🌦" };
  if (code <= 67) return { label: "雨", emoji: "🌧" };
  if (code <= 77) return { label: "雪", emoji: "❄️" };
  if (code <= 82) return { label: "にわか雨", emoji: "🌦" };
  if (code <= 86) return { label: "にわか雪", emoji: "🌨" };
  return { label: "雷雨", emoji: "⛈" };
}

type OpenMeteoHourly = {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  precipitation_probability: number[];
  weather_code: number[];
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

export async function getDayWeather(lat: number, lon: number, date: string): Promise<DayWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code` +
    `&timezone=${encodeURIComponent(TZ)}&start_date=${date}&end_date=${date}`;
  // 30分はこの端末に保存した結果を使う
  const cacheKey = `kyounofuku:weather:${lat},${lon},${date}`;
  try {
    const hit = JSON.parse(sessionStorage.getItem(cacheKey) ?? "null") as { at: number; w: DayWeather } | null;
    if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.w;
  } catch {
    // 保存領域が使えなくても取得は続ける
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const data = (await res.json()) as { hourly: OpenMeteoHourly };
    const w = aggregate(date, data.hourly);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), w }));
    } catch {
      // 保存できなくても問題なし
    }
    return w;
  } catch (e) {
    console.warn("[weather] fallback:", e);
    return fallbackWeather(date);
  }
}

function aggregate(date: string, h: OpenMeteoHourly): DayWeather {
  const periods = {} as Record<Period, PeriodWeather>;
  for (const p of PERIODS) {
    const [from, to] = PERIOD_META[p].hours;
    const idx = h.time.map((t, i) => ({ hour: Number(t.slice(11, 13)), i })).filter((x) => x.hour >= from && x.hour <= to).map((x) => x.i);
    const pick = (arr: number[]) => idx.map((i) => arr[i]).filter((v) => v != null);
    const codes = pick(h.weather_code);
    periods[p] = {
      temp: r1(avg(pick(h.temperature_2m))),
      apparent: r1(avg(pick(h.apparent_temperature))),
      humidity: Math.round(avg(pick(h.relative_humidity_2m))),
      precipProb: Math.max(0, ...pick(h.precipitation_probability)),
      code: codes.length ? Math.max(...codes) : 0,
    };
  }
  const daytime = h.temperature_2m.slice(7, 24);
  return {
    source: "open-meteo",
    date,
    periods,
    max: r1(Math.max(...daytime)),
    min: r1(Math.min(...daytime)),
    code: Math.max(...PERIODS.map((p) => periods[p].code)),
  };
}

/** API に届かないとき用の推定値（季節の平年値ベース） */
function fallbackWeather(date: string): DayWeather {
  const month = Number(date.slice(5, 7));
  const base = [6, 7, 10, 15, 20, 23, 27, 28, 24, 19, 13, 8][month - 1];
  const mk = (d: number): PeriodWeather => ({ temp: base + d, apparent: base + d - 1, humidity: 60, precipProb: 10, code: 1 });
  return {
    source: "fallback",
    date,
    periods: { MORNING: mk(-3), NOON: mk(3), EVENING: mk(1), NIGHT: mk(-4) },
    max: base + 4,
    min: base - 5,
    code: 1,
  };
}

export type GeoResult = { name: string; admin: string; lat: number; lon: number };

export async function searchArea(q: string): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=ja&countryCode=JP`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: { name: string; admin1?: string; latitude: number; longitude: number }[] };
  return (data.results ?? []).map((r) => ({ name: r.name, admin: r.admin1 ?? "", lat: r.latitude, lon: r.longitude }));
}
