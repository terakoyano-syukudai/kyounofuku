"use client";

import { useEffect, useRef, useState } from "react";
import { prepareForOcr, rotateImage, type Crop, type Rotation } from "@/lib/ocr";
import { Button } from "../ui";

/**
 * タグ写真の文字部分を指で囲んで切り抜く全画面の画面。
 * 囲んだ範囲だけを読むので、背景や柄を文字と間違えにくくなる。
 */
export function TagCropper({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (prepared: HTMLCanvasElement) => void }) {
  const [rotation, setRotation] = useState<Rotation>(0);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // 写真を読み込み、回転を反映した表示用の画像を作る（長辺2400pxまで）
  useEffect(() => {
    let alive = true;
    createImageBitmap(file).then((bmp) => {
      if (!alive) return;
      const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const rotated = rotateImage(c, rotation);
      setSource(rotated);
      setPreview(rotated.toDataURL("image/jpeg", 0.85));
      setCrop(null);
    });
    return () => {
      alive = false;
    };
  }, [file, rotation]);

  const toFrac = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  const onDown = (e: React.PointerEvent) => {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // 指の追跡を開始できない端末でも、囲む操作自体は続ける
    }
    const p = toFrac(e);
    drag.current = p;
    setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toFrac(e);
    const s = drag.current;
    setCrop({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const onUp = () => {
    drag.current = null;
    // 小さすぎる範囲は「囲んでいない」とみなす
    setCrop((c) => (c && c.w > 0.05 && c.h > 0.03 ? c : null));
  };

  const read = () => {
    if (!source) return;
    onDone(prepareForOcr(source, crop ?? { x: 0, y: 0, w: 1, h: 1 }));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label="タグの文字部分を選ぶ">
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-lg font-black">① 文字の部分を指でなぞって囲む</p>
        <p className="mt-1 text-sm text-white/80">素材の「%」や洗濯の注意書きが入るように囲むと、読み取りの精度が上がります。囲まなければ写真全体を読みます。</p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        {preview ? (
          <div
            ref={boxRef}
            className="relative max-h-full touch-none select-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="タグの写真" className="block max-h-[60dvh] max-w-full" draggable={false} />
            {crop && (
              <div
                className="pointer-events-none absolute border-[3px] border-yellow-300 shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
                style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
              />
            )}
          </div>
        ) : (
          <p className="text-base">写真を読み込み中…</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="ghost" className="!border-white/40 !bg-white/10 !text-white" onClick={() => setRotation((r) => ((r + 90) % 360) as Rotation)}>
          ↻ 90°回転
        </Button>
        <Button variant="ghost" className="!border-white/40 !bg-white/10 !text-white" onClick={() => setCrop(null)} disabled={!crop}>
          囲みを消す
        </Button>
        <Button variant="ghost" className="!border-white/40 !bg-white/10 !text-white" onClick={onCancel}>
          やめる
        </Button>
        <Button onClick={read} disabled={!source}>
          {crop ? "② 囲んだ所を読む" : "② 写真全体を読む"}
        </Button>
      </div>
    </div>
  );
}
