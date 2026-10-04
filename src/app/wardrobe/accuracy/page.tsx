"use client";

import Link from "next/link";
import { z } from "zod";
import { AccuracyBars } from "@/components/accuracy/AccuracyBars";
import { Loading } from "@/components/Loading";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { FIELDS, compareAnalysis, isMiss, summarize, type Comparison } from "@/lib/ai/accuracy";
import { CATEGORIES } from "@/lib/constants";
import { findBrand, listItems, useAppData, type AppData } from "@/lib/store";
import type { WardrobeItem } from "@/lib/types";

// 登録時に保存した読み取り結果（{ mode, analysis }）
const StoredSchema = z.object({
  mode: z.string(),
  model: z.string().nullable().optional(),
  analysis: z.object({
    brand: z.string().default(""),
    category: z.enum(CATEGORIES).nullable().default(null),
    sub_category: z.string().nullable().default(null),
    size: z.string().default(""),
    materials: z.array(z.object({ name: z.string(), pct: z.number() })).default([]),
    care_symbols: z.array(z.string()).default([]),
  }),
});

function compareAll(data: AppData) {
  // 表記ゆれ（UNIQLO / ユニクロ）は同じブランドとみなす
  const sameBrand = (a: string, b: string) => {
    const ba = findBrand(data, a),
      bb = findBrand(data, b);
    if (ba && bb) return ba.id === bb.id;
    return a.toLowerCase().replace(/\s/g, "") === b.toLowerCase().replace(/\s/g, "");
  };
  const rows: { item: WardrobeItem; cmp: Comparison; method: "ocr" | "paste" }[] = [];
  for (const item of listItems(data)) {
    const raw = StoredSchema.safeParse(item.aiRaw);
    if (!raw.success || raw.data.mode !== "ocr") continue;
    rows.push({
      method: raw.data.model === "paste" ? "paste" : "ocr",
      item,
      cmp: compareAnalysis(
        raw.data.analysis,
        {
          brandName: item.brandName,
          category: item.category,
          subCategory: item.subCategory,
          size: item.size,
          materials: item.materials,
          careSymbols: item.careSymbols,
        },
        sameBrand,
      ),
    });
  }
  return rows;
}

const METHOD_LABEL = { ocr: "📷 タグ写真の文字認識（アプリ内）", paste: "📋 Galaxyで読んだ文字の貼り付け" } as const;

export default function AccuracyPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const rows = compareAll(data);

  return (
    <div>
      <PageHeader
        title="タグ読み取りの精度"
        description="登録時の「内容を確認」で直した項目を、読み取りの間違いとして数えています。直さずに保存した項目は正解扱いになるので、確認が甘いと実際より高く出ます。"
        back={{ href: "/wardrobe/", label: "クローゼット" }}
      />

      {rows.length === 0 && (
        <Card>
          <p className="text-base text-muted">まだデータがありません。タグを読み取って服を登録すると、読み取り方法ごとに集計されます。</p>
        </Card>
      )}

      {(["ocr", "paste"] as const).map((method) => {
        const list = rows.filter((r) => r.method === method);
        if (!list.length) return null;
        const summary = summarize(list.map((r) => r.cmp));
        const mistakes = list.filter((r) => FIELDS.some((f) => isMiss(r.cmp.fields[f.id])));
        return (
          <div key={method}>
            <SectionTitle>{METHOD_LABEL[method]}</SectionTitle>
            <Card>
              <AccuracyBars summary={summary} />
            </Card>
            {mistakes.length > 0 && (
              <details className="mt-3">
                <summary className="flex min-h-11 cursor-pointer items-center px-1 text-base font-bold">読み間違えた項目を見る（{mistakes.length}着）</summary>
                <ul className="mt-2 space-y-2">
                  {mistakes.map((r) => (
                    <li key={r.item.id}>
                      <Link href={`/wardrobe/item/?id=${r.item.id}`} className="block rounded-2xl border-2 border-line bg-surface p-3 text-base">
                        <div className="mb-1 font-bold">{[r.item.brandName, r.item.name].filter(Boolean).join(" ") || "（名前なし）"}</div>
                        {FIELDS.filter((f) => isMiss(r.cmp.fields[f.id])).map((f) => (
                          <div key={f.id} className="text-sm">
                            {f.label}: <span className="text-red-600 line-through">{r.cmp.fields[f.id].ai}</span> → <b>{r.cmp.fields[f.id].truth}</b>
                          </div>
                        ))}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
