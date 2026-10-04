"use client";

// 服の写真: 縮小して端末内の IndexedDB に保存する（localStorage は容量が小さいため）。
// 色の自動判定もここで行う（写真は外部に送らない）。
import { useEffect, useState } from "react";
import { COLOR_FAMILIES } from "./constants";

const DB_NAME = "kyounofuku";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const savePhoto = async (id: string, dataUrl: string) => {
  await tx("readwrite", (s) => s.put(dataUrl, id));
  notify();
};
export const deletePhoto = async (id: string) => {
  await tx("readwrite", (s) => s.delete(id));
  notify();
};
export const loadPhoto = (id: string) => tx<string | undefined>("readonly", (s) => s.get(id)).then((v) => v ?? null);

export async function allPhotos(): Promise<Record<string, string>> {
  const keys = (await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) as string[];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = await loadPhoto(k);
    if (v) out[k] = v;
  }
  return out;
}

export async function replaceAllPhotos(photos: Record<string, string>) {
  await tx("readwrite", (s) => s.clear());
  for (const [k, v] of Object.entries(photos)) await tx("readwrite", (s) => s.put(v, k));
  notify();
}

/** 写真を表示するためのフック（保存・削除で自動更新） */
export function usePhoto(id: string | null, enabled = true): string | null {
  const [state, setState] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!id || !enabled) return;
    let alive = true;
    const load = () => loadPhoto(id).then((url) => alive && setState({ id, url }));
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, [id, enabled]);
  return state && state.id === id ? state.url : null;
}

/** 画像ファイルを長辺 maxSide の JPEG に縮小 */
export async function resizeImage(file: File | Blob, maxSide: number, quality = 0.82): Promise<{ dataUrl: string; canvas: HTMLCanvasElement }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), canvas };
}

// ───── 色の自動判定 ─────

// sRGB → Lab（人の見た目に近い色の距離で比べるため）
function toLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const PALETTE = COLOR_FAMILIES.map((c) => {
  const n = parseInt(c.hex.slice(1), 16);
  return { id: c.id, lab: toLab((n >> 16) & 255, (n >> 8) & 255, n & 255) };
});

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const nearest = (lab: number[]) => PALETTE.reduce((best, p) => (dist(lab, p.lab) < dist(lab, best.lab) ? p : best)).id;

/**
 * 写真から服の色ファミリーを推定する。
 * 服は写真の中央にある前提で、周囲の帯から背景色を推定し、背景に近い画素は数えない。
 */
export function detectColor(source: HTMLCanvasElement): { color: string; confidence: number } {
  const N = 64;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(source, 0, 0, N, N);
  const px = g.getImageData(0, 0, N, N).data;
  const labAt = (x: number, y: number) => {
    const i = (y * N + x) * 4;
    return toLab(px[i], px[i + 1], px[i + 2]);
  };

  // 背景: 外周 4px の平均色
  const border: number[][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x < 4 || y < 4 || x >= N - 4 || y >= N - 4) border.push(labAt(x, y));
  const bg = [0, 1, 2].map((k) => border.reduce((s, l) => s + l[k], 0) / border.length);

  // 中央 60% の画素を色ファミリーごとに数える（中心ほど重く）
  const votes = new Map<string, number>();
  let total = 0;
  for (let y = Math.floor(N * 0.2); y < N * 0.8; y++) {
    for (let x = Math.floor(N * 0.2); x < N * 0.8; x++) {
      const lab = labAt(x, y);
      if (dist(lab, bg) < 12) continue; // 背景らしい画素は除外
      const w = 1.5 - Math.hypot(x - N / 2, y - N / 2) / N;
      const id = nearest(lab);
      votes.set(id, (votes.get(id) ?? 0) + w);
      total += w;
    }
  }
  if (!total) return { color: nearest(bg), confidence: 0.2 };
  const [color, v] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
  return { color, confidence: Math.min(1, v / total) };
}
