"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parseTagText, type BrandRef } from "@/lib/ai/parse-tag-text";
import { CARE_SYMBOLS, CATEGORIES, CATEGORY_LABEL, COLOR_FAMILIES, FITS, SUB_CATEGORIES, subCategoryById, type Category } from "@/lib/constants";
import { addItem } from "@/lib/store";
import { Button, Card, Chip, inkOn } from "../ui";

type Shot = { preview: string };

/** 長辺 2000px の JPEG に縮小（細かいタグの文字を読めるだけの解像度を残す） */
async function shrink(file: File): Promise<Shot> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return { preview: canvas.toDataURL("image/jpeg", 0.9) };
}

type Form = {
  brandName: string;
  name: string;
  category: Category;
  subCategory: string;
  color: string | null;
  fit: "slim" | "regular" | "loose";
  size: string;
  materials: { name: string; pct: number }[];
  careSymbols: string[];
  aiRaw?: unknown;
};

const emptyForm: Form = {
  brandName: "",
  name: "",
  category: "TOPS",
  subCategory: "tshirt",
  color: null,
  fit: "regular",
  size: "",
  materials: [{ name: "綿", pct: 100 }],
  careSymbols: [],
};

const OCR_STATUS: Record<string, string> = {
  "loading tesseract core": "文字認識の準備中",
  "initializing tesseract": "文字認識の準備中",
  "loading language traineddata": "日本語データを読み込み中（初回のみ数MB）",
  "initializing api": "文字認識の準備中",
  "recognizing text": "文字を読み取り中",
};

/** ブラウザ内で文字認識する（無料・画像は外部に送らない） */
async function runOcr(images: string[], onProgress: (label: string, pct: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["jpn", "eng"], 1, {
    logger: (m) => onProgress(OCR_STATUS[m.status] ?? "準備中", Math.round(m.progress * 100)),
  });
  try {
    const texts: string[] = [];
    for (const img of images) texts.push((await worker.recognize(img)).data.text);
    return texts.join("\n");
  } finally {
    await worker.terminate();
  }
}

type Meta = { found: string[]; text: string };

export function AddItemFlow({ brands }: { brands: BrandRef[] }) {
  const router = useRouter();
  const [shots, setShots] = useState<Shot[]>([]);
  const [status, setStatus] = useState<"idle" | "analyzing" | "review">("idle");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const next = await Promise.all([...files].slice(0, 3 - shots.length).map(shrink)).catch(() => null);
    if (!next) return setError("画像を読み込めませんでした。JPEG か PNG で試してください。");
    setShots((s) => [...s, ...next].slice(0, 3));
  }

  async function analyze() {
    setStatus("analyzing");
    setError(null);
    setProgress(null);
    try {
      const text = await runOcr(
        shots.map((s) => s.preview),
        (label, pct) => setProgress({ label, pct }),
      );
      const p = parseTagText(text, brands);
      const sub = p.sub_category ? subCategoryById(p.sub_category) : undefined;
      setForm({
        ...emptyForm,
        brandName: p.brand,
        category: sub?.category ?? emptyForm.category,
        subCategory: sub?.id ?? emptyForm.subCategory,
        size: p.size,
        materials: p.materials.length ? p.materials : emptyForm.materials,
        careSymbols: p.care_symbols,
        // 修正前の読み取り結果を残しておき、確定内容との差で精度を測る（カテゴリは推定しないので null）
        aiRaw: {
          mode: "ocr",
          model: "tesseract.js",
          analysis: { brand: p.brand, category: sub?.category ?? null, sub_category: sub?.id ?? null, size: p.size, materials: p.materials, care_symbols: p.care_symbols },
        },
      });
      setMeta({ found: p.found, text });
      setStatus("review");
    } catch (e) {
      console.error(e);
      setError("文字の読み取りに失敗しました。通信状況を確認して、もう一度お試しください。");
      setStatus("idle");
    }
  }

  function save() {
    if (!form.color) return;
    addItem({
      brandName: form.brandName,
      name: form.name || null,
      category: form.category,
      subCategory: form.subCategory,
      color: form.color,
      fit: form.fit,
      materials: form.materials,
      careSymbols: form.careSymbols,
      size: form.size || null,
      aiRaw: form.aiRaw,
    });
    router.push("/wardrobe?added=1");
  }

  if (status !== "review") {
    return (
      <div>
        <h1 className="px-1 text-2xl font-black">タグを撮って登録</h1>
        <p className="mt-1 px-1 text-sm text-muted">
          ブランドタグ・品質表示（素材の%）・洗濯表示を撮ると、自動で読み取ります（最大3枚）。
          写真はこの端末の中だけで読み取ります（無料）。文字が大きく、まっすぐ写るように撮ると精度が上がります。
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {shots.map((s, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.preview} alt={`タグ写真${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="削除"
                onClick={() => setShots((xs) => xs.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 h-7 w-7 rounded-full bg-black/60 text-sm text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {shots.length < 3 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-muted"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs">{shots.length ? "追加" : "撮影 / 選択"}</span>
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />

        {error && <p className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}

        <Button className="mt-5 w-full" disabled={!shots.length || status === "analyzing"} onClick={analyze}>
          {status === "analyzing"
            ? progress
              ? `${progress.label}… ${progress.pct}%`
              : "読み取り中…"
            : "タグを読み取る"}
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setStatus("review")}>
          写真なしで手入力する
        </Button>
      </div>
    );
  }

  const subs = SUB_CATEGORIES.filter((s) => s.category === form.category);

  return (
    <div className="space-y-3">
      <h1 className="px-1 text-2xl font-black">内容を確認</h1>
      {meta && (
        <div className="rounded-2xl bg-surface-2 p-3 text-xs leading-relaxed">
          <b>{meta.found.length ? `読み取れた項目: ${meta.found.join("・")}` : "文字をうまく読み取れませんでした"}</b>
          <br />
          洗濯表示の記号とアイテムの種類は読み取れないので、タグを見ながらタップしてください。色も選んでください。
          <details className="mt-1">
            <summary className="cursor-pointer">読み取った文字を見る</summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-bg p-2 text-[11px]">{meta.text.trim() || "（なし）"}</pre>
          </details>
        </div>
      )}

      <Card className="space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-muted">ブランド</span>
          <input
            value={form.brandName}
            onChange={(e) => set("brandName", e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-base"
            placeholder="例: UNIQLO"
            list="brand-options"
          />
          <datalist id="brand-options">
            {brands.map((b) => (
              <option key={b.name} value={b.name} />
            ))}
          </datalist>
          {form.brandName && (
            <span className="mt-1 block text-[11px] text-muted">
              {brands.some((b) => b.name === form.brandName) ? "✓ 登録済みのブランド" : "新しいブランド（価格帯は標準として扱います）"}
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-xs font-bold text-muted">アイテム名</span>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-base"
            placeholder="例: オックスフォードシャツ"
          />
        </label>
      </Card>

      <Card>
        <div className="text-xs font-bold text-muted">カテゴリ</div>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              active={form.category === c}
              onClick={() => setForm((f) => ({ ...f, category: c, subCategory: SUB_CATEGORIES.find((s) => s.category === c)!.id }))}
            >
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {subs.map((s) => (
            <Chip key={s.id} active={form.subCategory === s.id} onClick={() => set("subCategory", s.id)} className="text-xs">
              {s.label}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-xs font-bold text-muted">
          色 <span className="text-accent">*</span>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {COLOR_FAMILIES.map((c) => (
            <button key={c.id} type="button" onClick={() => set("color", c.id)} className="flex flex-col items-center gap-1">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${form.color === c.id ? "ring-3 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                style={{ background: c.hex, color: inkOn(c.hex), boxShadow: "0 0 0 1px rgb(0 0 0 / 0.1) inset" }}
              >
                {form.color === c.id ? "✓" : ""}
              </span>
              <span className="text-[10px] text-muted">{c.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 text-xs font-bold text-muted">サイズ感</div>
        <div className="mt-2 flex gap-1.5">
          {FITS.map((f) => (
            <Chip key={f.id} active={form.fit === f.id} onClick={() => set("fit", f.id)}>
              {f.label}
            </Chip>
          ))}
          <input
            value={form.size}
            onChange={(e) => set("size", e.target.value)}
            className="min-w-0 flex-1 rounded-full border border-line bg-bg px-3 text-sm"
            placeholder="サイズ表記"
            aria-label="サイズ表記"
          />
        </div>
      </Card>

      <Card>
        <div className="text-xs font-bold text-muted">素材</div>
        <ul className="mt-2 space-y-1.5">
          {form.materials.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={m.name}
                onChange={(e) => set("materials", form.materials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-base"
                aria-label="素材名"
              />
              <input
                type="number"
                inputMode="numeric"
                value={m.pct}
                onChange={(e) => set("materials", form.materials.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))}
                className="w-16 rounded-xl border border-line bg-bg px-2 py-2 text-right text-base"
                aria-label="割合"
              />
              <span className="text-sm text-muted">%</span>
              <button type="button" className="px-1 text-muted" aria-label="素材を削除" onClick={() => set("materials", form.materials.filter((_, j) => j !== i))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-2 text-xs font-bold text-accent" onClick={() => set("materials", [...form.materials, { name: "", pct: 0 }])}>
          ＋ 素材を追加
        </button>

        <div className="mt-4 text-xs font-bold text-muted">洗濯表示</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CARE_SYMBOLS.map((c) => (
            <Chip
              key={c.id}
              className="text-xs"
              active={form.careSymbols.includes(c.id)}
              onClick={() =>
                set("careSymbols", form.careSymbols.includes(c.id) ? form.careSymbols.filter((x) => x !== c.id) : [...form.careSymbols, c.id])
              }
            >
              {c.icon} {c.label}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="sticky bottom-20 grid grid-cols-[auto_1fr] gap-2 bg-bg py-2">
        <Button variant="ghost" onClick={() => setStatus("idle")}>
          撮り直す
        </Button>
        <Button disabled={!form.color} onClick={save}>
          {form.color ? "クローゼットに追加" : "色を選んでください"}
        </Button>
      </div>
    </div>
  );
}
