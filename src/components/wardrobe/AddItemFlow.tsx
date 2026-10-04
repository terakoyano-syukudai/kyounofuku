"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parseTagText, type BrandRef, type ParsedTag } from "@/lib/ai/parse-tag-text";
import { CARE_SYMBOLS, CATEGORIES, CATEGORY_LABEL, COLOR_FAMILIES, FITS, SUB_CATEGORIES, colorById, subCategoryById, type Category } from "@/lib/constants";
import { recognizeText } from "@/lib/ocr";
import { detectColor, resizeImage, savePhoto } from "@/lib/photo";
import { addItem } from "@/lib/store";
import { toast } from "@/lib/toast";
import { PURCHASE_APPROX, type PurchaseApprox } from "@/lib/types";
import { Button, Card, Chip, Notice, inkOn } from "../ui";
import { TagCropper } from "./TagCropper";

type Form = {
  brandName: string;
  name: string;
  category: Category;
  subCategory: string;
  color: string | null;
  colorAuto: boolean; // 写真から自動判定した色か
  fit: "slim" | "regular" | "loose";
  size: string;
  materials: { name: string; pct: number }[];
  careSymbols: string[];
  purchasedApprox: PurchaseApprox;
};

const emptyForm: Form = {
  brandName: "",
  name: "",
  category: "TOPS",
  subCategory: "tshirt",
  color: null,
  colorAuto: false,
  fit: "regular",
  size: "",
  materials: [],
  careSymbols: [],
  purchasedApprox: "unknown",
};

/** 読み取り結果の良さ（素材・サイズ・ブランド・洗濯表示がいくつ取れたか） */
const scoreFor = (brands: BrandRef[]) => (text: string) => parseTagText(text, brands).confidence;

/** 何度か読んだ結果をフォームに足していく（空いている欄だけ埋め、洗濯表示は追加） */
function merge(form: Form, p: ParsedTag): Form {
  const sub = p.sub_category ? subCategoryById(p.sub_category) : undefined;
  return {
    ...form,
    brandName: form.brandName || p.brand,
    size: form.size || p.size,
    materials: form.materials.length ? form.materials : p.materials,
    careSymbols: [...new Set([...form.careSymbols, ...p.care_symbols])],
    ...(sub && form.subCategory === emptyForm.subCategory && form.category === emptyForm.category ? { category: sub.category, subCategory: sub.id } : {}),
  };
}

type ReadLog = { source: "ocr" | "paste"; found: string[]; text: string };

export function AddItemFlow({ brands }: { brands: BrandRef[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(emptyForm);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [reading, setReading] = useState<{ label: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ReadLog[]>([]);
  const [firstRead, setFirstRead] = useState<ParsedTag | null>(null); // 精度の集計用（修正前の最初の読み取り）
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const tagInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const applyParsed = (p: ParsedTag, log: ReadLog) => {
    setFirstRead((prev) => prev ?? p);
    setForm((f) => merge(f, p));
    setLogs((l) => [...l, log]);
    toast(p.found.length ? `読み取りました: ${p.found.join("・")}` : "文字を読み取れませんでした", p.found.length ? "success" : "error");
  };

  // ① 服全体の写真: 保存用に縮小し、色を自動判定
  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const { dataUrl, canvas } = await resizeImage(file, 720);
      setPhoto(dataUrl);
      const { color } = detectColor(canvas);
      setForm((f) => ({ ...f, color, colorAuto: true }));
      toast(`写真から色を「${colorById(color).label}」と判定しました`);
    } catch {
      setError("写真を読み込めませんでした。別の写真で試してください。");
    }
  }

  // ② タグ: 切り抜き画面で整えた画像を文字認識
  async function onCropped(prepared: HTMLCanvasElement) {
    setCropFile(null);
    setError(null);
    setReading({ label: "準備中", pct: 0 });
    try {
      const text = await recognizeText(prepared, scoreFor(brands), (label, pct) => setReading({ label, pct }));
      const p = parseTagText(text, brands);
      applyParsed(p, { source: "ocr", found: p.found, text });
    } catch (e) {
      console.error(e);
      setError("文字の読み取りに失敗しました。通信状況を確認して、もう一度お試しください。");
    } finally {
      setReading(null);
    }
  }

  function onPaste() {
    const text = pasteText.trim();
    if (!text) return;
    const p = parseTagText(text, brands);
    applyParsed(p, { source: "paste", found: p.found, text });
    setPasteText("");
    setPasteOpen(false);
  }

  async function save() {
    if (!form.color) return;
    const id = addItem({
      brandName: form.brandName,
      name: form.name || null,
      category: form.category,
      subCategory: form.subCategory,
      color: form.color,
      fit: form.fit,
      materials: form.materials,
      careSymbols: form.careSymbols,
      size: form.size || null,
      purchasedApprox: form.purchasedApprox,
      hasPhoto: !!photo,
      // 修正前の最初の読み取り結果を残し、確定内容との差で精度を測る（カテゴリは推定しないので null）
      aiRaw: firstRead
        ? {
            mode: "ocr",
            model: logs[0]?.source === "paste" ? "paste" : "tesseract.js",
            analysis: { brand: firstRead.brand, category: null, sub_category: firstRead.sub_category, size: firstRead.size, materials: firstRead.materials, care_symbols: firstRead.care_symbols },
          }
        : undefined,
    });
    if (photo) await savePhoto(id, photo).catch(() => toast("写真を保存できませんでした", "error"));
    toast("クローゼットに追加しました");
    router.push("/wardrobe/");
  }

  const subs = SUB_CATEGORIES.filter((s) => s.category === form.category);
  const color = form.color ? colorById(form.color) : null;

  return (
    <div className="space-y-4">
      {cropFile && <TagCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={onCropped} />}

      {/* ① 服全体の写真 */}
      <Card>
        <StepTitle n={1} title="服全体の写真" hint="任意。写真から色を自動で判定します" />
        {photo ? (
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="登録する服の写真" className="h-28 w-28 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1 space-y-2">
              {color && (
                <p className="flex items-center gap-2 text-base">
                  <span className="inline-block h-6 w-6 rounded-full border border-line" style={{ background: color.hex }} />
                  <b>{color.label}</b>
                  {form.colorAuto && <span className="text-sm text-muted">（自動判定）</span>}
                </p>
              )}
              <Button variant="ghost" className="w-full" onClick={() => photoInput.current?.click()}>
                撮り直す
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="mt-3 w-full !min-h-16 text-lg" onClick={() => photoInput.current?.click()}>
            👕 服全体を撮る
          </Button>
        )}
        <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (onPhoto(e.target.files?.[0]), (e.target.value = ""))} />
      </Card>

      {/* ② タグの読み取り */}
      <Card>
        <StepTitle n={2} title="タグを読み取る" hint="任意。素材・サイズ・ブランド・洗濯の注意書きを自動で入力します" />
        <div className="mt-3 grid gap-2">
          <Button variant="ghost" className="!min-h-16 text-lg" disabled={!!reading} onClick={() => tagInput.current?.click()}>
            {reading ? `${reading.label}… ${reading.pct}%` : "📷 タグを撮って読む"}
          </Button>
          <Button variant="ghost" className="!min-h-16 text-lg" disabled={!!reading} onClick={() => setPasteOpen((o) => !o)}>
            📋 Galaxyで読んだ文字を貼り付け
          </Button>
        </div>
        <input
          ref={tagInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) setCropFile(f);
          }}
        />

        {pasteOpen && (
          <div className="mt-3 space-y-2">
            <Notice>
              <b>Galaxyのテキスト抽出の使い方</b>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>カメラでタグを撮るか、ギャラリーでタグの写真を開く</li>
                <li>画面に出る「T」（テキストを抽出）ボタンを押す</li>
                <li>「すべて選択」→「コピー」</li>
                <li>下の欄を長押しして貼り付け</li>
              </ol>
              <span className="text-muted">※ 機種やOSのバージョンによって表示が異なります</span>
            </Notice>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder="ここに貼り付け（例: 綿 60% ポリエステル 40% …）"
              className="w-full rounded-2xl border-2 border-line bg-bg p-3 text-base"
            />
            <Button className="w-full" disabled={!pasteText.trim()} onClick={onPaste}>
              この文字から読み取る
            </Button>
          </div>
        )}

        {error && (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {logs.length > 0 && (
          <div className="mt-3 space-y-2">
            {logs.map((l, i) => (
              <Notice key={i} tone={l.found.length ? "success" : "warn"}>
                <b>{l.source === "paste" ? "貼り付けた文字" : `タグ写真 ${logs.filter((x, j) => x.source === "ocr" && j <= i).length}枚目`}</b>：
                {l.found.length ? `${l.found.join("・")}を読み取りました` : "読み取れませんでした。文字の部分だけを囲んで撮り直すか、Galaxyの貼り付けをお試しください"}
                <details className="mt-1">
                  <summary className="cursor-pointer text-muted">読み取った文字を見る</summary>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-bg p-2 text-sm">{l.text.trim() || "（なし）"}</pre>
                </details>
              </Notice>
            ))}
            <p className="px-1 text-sm text-muted">別のタグ（洗濯表示など）も続けて読むと、空いている欄が埋まります。</p>
          </div>
        )}
      </Card>

      {/* ③ 内容の確認 */}
      <Card className="space-y-5">
        <StepTitle n={3} title="内容を確認して保存" hint="違うところはタップで直してください" />

        <Field label="ブランド">
          <input
            value={form.brandName}
            onChange={(e) => set("brandName", e.target.value)}
            className="w-full rounded-2xl border-2 border-line bg-bg px-4 py-3 text-base"
            placeholder="例: UNIQLO"
            list="brand-options"
          />
          <datalist id="brand-options">
            {brands.map((b) => (
              <option key={b.name} value={b.name} />
            ))}
          </datalist>
        </Field>

        <Field label="アイテム名（任意）">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-2xl border-2 border-line bg-bg px-4 py-3 text-base"
            placeholder="例: オックスフォードシャツ"
          />
        </Field>

        <Field label="カテゴリ" required>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c} active={form.category === c} onClick={() => setForm((f) => ({ ...f, category: c, subCategory: SUB_CATEGORIES.find((s) => s.category === c)!.id }))}>
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {subs.map((s) => (
              <Chip key={s.id} active={form.subCategory === s.id} onClick={() => set("subCategory", s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="色" required hint={form.colorAuto ? "写真から自動で選びました。違う場合はタップで直してください" : undefined}>
          <div className="grid grid-cols-5 gap-2">
            {COLOR_FAMILIES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={form.color === c.id}
                onClick={() => setForm((f) => ({ ...f, color: c.id, colorAuto: false }))}
                className="flex min-h-16 flex-col items-center gap-1"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${form.color === c.id ? "ring-4 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                  style={{ background: c.hex, color: inkOn(c.hex), boxShadow: "0 0 0 1px rgb(0 0 0 / 0.15) inset" }}
                >
                  {form.color === c.id ? "✓" : ""}
                </span>
                <span className="text-xs">{c.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="購入した時期" hint="買い替え時期の目安に使います">
          <div className="flex flex-wrap gap-2">
            {PURCHASE_APPROX.map((p) => (
              <Chip key={p.id} active={form.purchasedApprox === p.id} onClick={() => set("purchasedApprox", p.id)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="サイズ感・サイズ表記">
          <div className="flex flex-wrap gap-2">
            {FITS.map((f) => (
              <Chip key={f.id} active={form.fit === f.id} onClick={() => set("fit", f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
          <input
            value={form.size}
            onChange={(e) => set("size", e.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-line bg-bg px-4 py-3 text-base"
            placeholder="サイズ表記（例: M、W31 L32）"
            aria-label="サイズ表記"
          />
        </Field>

        <Field label="素材">
          {form.materials.length === 0 && <p className="mb-2 text-sm text-muted">タグを読むと自動で入ります。手で追加もできます。</p>}
          <ul className="space-y-2">
            {form.materials.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  value={m.name}
                  onChange={(e) => set("materials", form.materials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-bg px-3 py-3 text-base"
                  aria-label="素材名"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={m.pct}
                  onChange={(e) => set("materials", form.materials.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))}
                  className="w-20 rounded-2xl border-2 border-line bg-bg px-2 py-3 text-right text-base"
                  aria-label="割合"
                />
                <span className="text-base">%</span>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-muted"
                  aria-label="この素材を削除"
                  onClick={() => set("materials", form.materials.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => set("materials", [...form.materials, { name: "", pct: 0 }])}>
            ＋ 素材を追加
          </Button>
        </Field>

        <Field label="洗濯表示" hint="記号は読み取れないので、タグを見ながらタップしてください">
          <div className="flex flex-wrap gap-2">
            {CARE_SYMBOLS.map((c) => (
              <Chip
                key={c.id}
                active={form.careSymbols.includes(c.id)}
                onClick={() => set("careSymbols", form.careSymbols.includes(c.id) ? form.careSymbols.filter((x) => x !== c.id) : [...form.careSymbols, c.id])}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>
      </Card>

      <div className="sticky bottom-24 z-10 bg-bg/95 py-2 backdrop-blur">
        <Button className="w-full !min-h-14 text-lg" disabled={!form.color} onClick={save}>
          {form.color ? "✓ クローゼットに追加" : "色を選ぶと保存できます"}
        </Button>
      </div>
    </div>
  );
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-black">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-base text-accent-ink">{n}</span>
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <span className="text-base font-bold">{label}</span>
        {required && <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-xs font-bold text-accent">必須</span>}
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
