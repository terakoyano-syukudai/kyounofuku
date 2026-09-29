"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfile } from "@/lib/store";
import {
  BODY_SHAPES,
  BUDGET_CATEGORIES,
  CATEGORY_LABEL,
  COLOR_FAMILIES,
  COVER_CONCERNS,
  TASTE_TAGS,
  yen,
} from "@/lib/constants";
import type { BodyProfile, StylePreference } from "@/lib/types";
import { Button, Chip, LabeledSlider, inkOn } from "../ui";

const STEPS = ["体型", "サイズ感", "テイスト", "予算"] as const;

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const lengthWord = (v: number) => (v < 34 ? "短め" : v > 66 ? "長め" : "標準");
const fitWord = (v: number) => (v < 25 ? "ジャスト" : v < 50 ? "ややジャスト" : v < 75 ? "ややゆったり" : "オーバーサイズ");
const heatWord = (v: number) => (v < 34 ? "暑がり" : v > 66 ? "寒がり" : "ふつう");
const formalWord = (v: number) => (v < 25 ? "ラフ" : v < 50 ? "カジュアル" : v < 75 ? "きれいめカジュアル" : "きれいめ");

export function ProfileWizard({
  initial,
  editing,
}: {
  initial: { body: BodyProfile; style: StylePreference; budgets: Record<string, number> };
  editing: boolean;
}) {
  const [step, setStepRaw] = useState(0);
  const setStep = (next: number | ((s: number) => number)) => {
    setStepRaw(next);
    window.scrollTo({ top: 0 });
  };
  const [body, setBody] = useState(initial.body);
  const [style, setStyle] = useState(initial.style);
  const [budgets, setBudgets] = useState(initial.budgets);
  const router = useRouter();

  const b = <K extends keyof BodyProfile>(k: K, v: BodyProfile[K]) => setBody((p) => ({ ...p, [k]: v }));
  const s = <K extends keyof StylePreference>(k: K, v: StylePreference[K]) => setStyle((p) => ({ ...p, [k]: v }));
  const last = step === STEPS.length - 1;

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <div className="flex gap-1.5 pt-2">
        {STEPS.map((label, i) => (
          <button key={label} type="button" onClick={() => setStep(i)} className="flex-1 text-left">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-surface-2"}`} />
            <div className={`mt-1 text-[11px] ${i === step ? "font-bold" : "text-muted"}`}>{label}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 py-4">
        {step === 0 && (
          <>
            <h1 className="text-2xl font-black">あなたの体型を教えてください</h1>
            <p className="mt-1 text-sm text-muted">タップとスライダーだけ。あとから変更できます。</p>
            <LabeledSlider
              label="身長"
              min={140}
              max={200}
              value={body.heightCm ?? 165}
              onChange={(v) => b("heightCm", v)}
              display={`${body.heightCm ?? 165} cm`}
            />
            <div className="mt-3 text-sm font-bold">骨格タイプ</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BODY_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => b("bodyShape", shape.id)}
                  className={`rounded-2xl border p-3 text-left ${body.bodyShape === shape.id ? "border-accent bg-accent/10" : "border-line bg-surface"}`}
                >
                  <div className="text-sm font-bold">{shape.label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted">{shape.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-5 text-sm font-bold">カバーしたいところ（複数OK）</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {COVER_CONCERNS.map((c) => (
                <Chip key={c.id} active={body.coverConcerns.includes(c.id)} onClick={() => b("coverConcerns", toggle(body.coverConcerns, c.id))}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-black">好きなサイズ感は？</h1>
            <p className="mt-1 text-sm text-muted">コーデの採点に使います。</p>
            <div className="mt-3 space-y-2">
              <LabeledSlider label="シルエット" left="ジャスト" right="オーバー" value={body.fitPref} onChange={(v) => b("fitPref", v)} display={fitWord(body.fitPref)} />
              <LabeledSlider label="トップスの丈" left="短め" right="長め" value={body.topLengthPref} onChange={(v) => b("topLengthPref", v)} display={lengthWord(body.topLengthPref)} />
              <LabeledSlider
                label="ボトムスの丈"
                left="短め"
                right="長め"
                value={body.bottomLengthPref}
                onChange={(v) => b("bottomLengthPref", v)}
                display={lengthWord(body.bottomLengthPref)}
              />
              <LabeledSlider
                label="暑がり・寒がり"
                left="暑がり"
                right="寒がり"
                value={body.heatSensitivity}
                onChange={(v) => b("heatSensitivity", v)}
                display={heatWord(body.heatSensitivity)}
              />
              <p className="text-xs text-muted">寒がりほど、体感温度を低めに見積もって羽織りを提案します。</p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-black">好きなテイストは？</h1>
            <LabeledSlider
              label="普段のフォーマル度"
              left="ラフ"
              right="きれいめ"
              value={style.formality}
              onChange={(v) => s("formality", v)}
              display={formalWord(style.formality)}
            />
            <div className="mt-3 text-sm font-bold">好きな雰囲気（複数OK）</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TASTE_TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => s("tasteTags", toggle(style.tasteTags, t.id))}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
                    style.tasteTags.includes(t.id) ? "border-accent bg-accent/10 font-bold" : "border-line bg-surface"
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-5 text-sm font-bold">色の好み</div>
            <p className="text-xs text-muted">1回タップで「好き」、2回で「避けたい」、3回で解除</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {COLOR_FAMILIES.map((c) => {
                const liked = style.colorLikes.includes(c.id);
                const avoided = style.colorAvoids.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (!liked && !avoided) s("colorLikes", [...style.colorLikes, c.id]);
                      else if (liked) {
                        setStyle((p) => ({ ...p, colorLikes: p.colorLikes.filter((x) => x !== c.id), colorAvoids: [...p.colorAvoids, c.id] }));
                      } else s("colorAvoids", style.colorAvoids.filter((x) => x !== c.id));
                    }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                        liked ? "ring-3 ring-accent ring-offset-2 ring-offset-bg" : ""
                      } ${avoided ? "opacity-30" : ""}`}
                      style={{ background: c.hex, color: inkOn(c.hex), boxShadow: "0 0 0 1px rgb(0 0 0 / 0.1) inset" }}
                    >
                      {liked ? "♥" : avoided ? "✕" : ""}
                    </span>
                    <span className="text-[10px] text-muted">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-black">1着あたりの予算は？</h1>
            <p className="mt-1 text-sm text-muted">買い足し提案はこの金額以内に絞ります。</p>
            <div className="mt-4 text-sm font-bold">よく見る売り場</div>
            <div className="mt-2 flex gap-2">
              {(
                [
                  ["mens", "メンズ"],
                  ["womens", "レディース"],
                  ["all", "どちらも"],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={style.shopSection === id} onClick={() => s("shopSection", id)}>
                  {label}
                </Chip>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {BUDGET_CATEGORIES.map((c) => (
                <LabeledSlider
                  key={c}
                  label={CATEGORY_LABEL[c]}
                  min={1000}
                  max={c === "OUTER" ? 60000 : 30000}
                  step={500}
                  value={budgets[c] ?? 5000}
                  onChange={(v) => setBudgets((p) => ({ ...p, [c]: v }))}
                  display={`${yen(budgets[c] ?? 5000)} まで`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 grid grid-cols-[auto_1fr] gap-2 bg-bg py-3">
        <Button variant="ghost" onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0}>
          戻る
        </Button>
        {last ? (
          <Button
            onClick={() => {
              saveProfile(body, style, budgets);
              router.push("/");
            }}
          >
            {editing ? "保存する" : "はじめる"}
          </Button>
        ) : (
          <Button onClick={() => setStep((x) => x + 1)}>次へ</Button>
        )}
      </div>
    </div>
  );
}
