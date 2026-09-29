"use client";

import Link from "next/link";
import { z } from "zod";
import { AccuracyBars } from "@/components/accuracy/AccuracyBars";
import { Loading } from "@/components/Loading";
import { Card, SectionTitle } from "@/components/ui";
import { FIELDS, compareAnalysis, isMiss, summarize, type Comparison } from "@/lib/ai/accuracy";
import { CATEGORIES } from "@/lib/constants";
import { findBrand, listItems, useAppData, type AppData } from "@/lib/store";
import type { WardrobeItem } from "@/lib/types";

// 登録時に保存した読み取り結果（{ mode, analysis }）
const StoredSchema = z.object({
  mode: z.string(),
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
  const rows: { item: WardrobeItem; cmp: Comparison }[] = [];
  for (const item of listItems(data)) {
    const raw = StoredSchema.safeParse(item.aiRaw);
    if (!raw.success || raw.data.mode !== "ocr") continue;
    rows.push({
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
  return { rows, summary: summarize(rows.map((r) => r.cmp)) };
}

export default function AccuracyPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const { rows, summary } = compareAll(data);
  const mistakes = rows.filter((r) => FIELDS.some((f) => isMiss(r.cmp.fields[f.id])));

  return (
    <div>
      <Link href="/wardrobe" className="px-1 text-sm text-muted">
        ‹ クローゼット
      </Link>
      <h1 className="mt-2 px-1 text-2xl font-black">タグ読み取りの精度</h1>
      <p className="mt-1 px-1 text-xs leading-relaxed text-muted">
        登録時の「内容を確認」で直した項目を、読み取りの間違いとして数えています。直さずに保存した項目は正解扱いになるので、確認が甘いと実際より高く出ます。
      </p>

      <SectionTitle>端末内の文字認識</SectionTitle>
      <Card>
        {summary.n === 0 ? (
          <p className="text-sm text-muted">まだデータがありません。タグ写真から服を登録すると、ここに集計されます。</p>
        ) : (
          <AccuracyBars summary={summary} />
        )}
      </Card>

      {mistakes.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer px-1 text-xs font-bold text-muted">読み間違えた項目（{mistakes.length}着）</summary>
          <ul className="mt-2 space-y-2">
            {mistakes.map((r) => (
              <li key={r.item.id}>
                <Link href={`/wardrobe/item?id=${r.item.id}`} className="block rounded-2xl bg-surface p-3 text-xs">
                  <div className="mb-1 text-sm font-bold">{[r.item.brandName, r.item.name].filter(Boolean).join(" ") || "（名前なし）"}</div>
                  {FIELDS.filter((f) => isMiss(r.cmp.fields[f.id])).map((f) => (
                    <div key={f.id}>
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
}
