"use client";

// タグ写真の文字認識（端末内・無料）。精度を上げるため、読む前に画像を整える:
//  1. 指で囲んだ範囲だけを切り抜く（背景や柄を読まない）
//  2. 回転（横向きのタグ用）
//  3. 小さい文字を拡大し、白黒にしてコントラストを上げる
//  4. 黒地に白文字のタグは反転する
// さらに、レイアウトの読み方を2通り試して、項目を多く取れた方を採用する。

export type Crop = { x: number; y: number; w: number; h: number }; // 0〜1 の割合
export type Rotation = 0 | 90 | 180 | 270;

/** 画像を回転したキャンバスを作る（切り抜き UI の表示にも使う） */
export function rotateImage(img: CanvasImageSource & { width: number; height: number }, rotation: Rotation): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const swap = rotation === 90 || rotation === 270;
  c.width = swap ? img.height : img.width;
  c.height = swap ? img.width : img.height;
  const g = c.getContext("2d")!;
  g.translate(c.width / 2, c.height / 2);
  g.rotate((rotation * Math.PI) / 180);
  g.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}

/** 切り抜き → 拡大 → 白黒・コントラスト補正 → 必要なら反転 */
export function prepareForOcr(rotated: HTMLCanvasElement, crop: Crop): HTMLCanvasElement {
  const sx = Math.round(crop.x * rotated.width);
  const sy = Math.round(crop.y * rotated.height);
  const sw = Math.max(1, Math.round(crop.w * rotated.width));
  const sh = Math.max(1, Math.round(crop.h * rotated.height));
  // 文字が十分な大きさになるよう、切り抜き幅を約1600pxにそろえる（最大3倍まで拡大）
  const scale = Math.min(3, 1600 / sw);
  const c = document.createElement("canvas");
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  g.drawImage(rotated, sx, sy, sw, sh, 0, 0, c.width, c.height);

  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const gray = new Uint8ClampedArray(d.length / 4);
  const hist = new Array(256).fill(0);
  let sum = 0;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    gray[j] = v;
    hist[v]++;
    sum += v;
  }
  // 明るさの下位2%・上位2%を黒・白にそろえてコントラストを伸ばす
  const n = gray.length;
  let lo = 0,
    hi = 255,
    acc = 0;
  for (let v = 0; v < 256; v++) if ((acc += hist[v]) > n * 0.02) { lo = v; break; }
  acc = 0;
  for (let v = 255; v >= 0; v--) if ((acc += hist[v]) > n * 0.02) { hi = v; break; }
  const range = Math.max(1, hi - lo);
  const invert = sum / n < 110; // 暗い背景（黒地に白文字）なら反転
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    let v = ((gray[j] - lo) * 255) / range;
    v = Math.max(0, Math.min(255, v));
    if (invert) v = 255 - v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const STATUS: Record<string, string> = {
  "loading tesseract core": "文字認識の準備中",
  "initializing tesseract": "文字認識の準備中",
  "loading language traineddata": "日本語データを読み込み中（初回のみ数MB）",
  "initializing api": "文字認識の準備中",
  "recognizing text": "文字を読み取り中",
};

/**
 * 文字認識。score で「読み取り結果の良さ」を返す関数を渡すと、
 * 1回目（ひとかたまりの文章として読む）の結果が悪いときに、2回目（ばらばらの文字として読む）も試して良い方を返す。
 */
export async function recognizeText(
  image: HTMLCanvasElement,
  score: (text: string) => number,
  onProgress: (label: string, pct: number) => void,
): Promise<string> {
  const { createWorker, PSM } = await import("tesseract.js");
  let label = "";
  const worker = await createWorker(["jpn", "eng"], 1, {
    logger: (m) => onProgress(`${STATUS[m.status] ?? "準備中"}${m.status === "recognizing text" ? label : ""}`, Math.round(m.progress * 100)),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1" });
    let best = { text: "", score: -1, canvas: image };
    const attempt = async (canvas: HTMLCanvasElement, l: string) => {
      label = l;
      const text = (await worker.recognize(canvas)).data.text;
      const s = score(text);
      if (s > best.score) best = { text, score: s, canvas };
    };
    await attempt(image, "");
    if (best.score >= 0.75) return best.text;
    // 横向きのタグかもしれないので、90°・270°回転も試す
    await attempt(rotateImage(image, 90), "（向きを変えて再挑戦 1/2）");
    if (best.score < 0.75) await attempt(rotateImage(image, 270), "（向きを変えて再挑戦 2/2）");
    // まだ悪ければ、文字がばらばらに配置されたタグとして読み直す
    if (best.score < 0.5) {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      await attempt(best.canvas, "（読み方を変えて再挑戦）");
    }
    return best.text;
  } finally {
    await worker.terminate();
  }
}
