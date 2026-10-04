"use client";

import { colorById, subCategoryById } from "@/lib/constants";
import { LIFE_STATUS_LABEL, type LifeInfo } from "@/lib/engine/lifespan";
import { usePhoto } from "@/lib/photo";
import type { WardrobeItem } from "@/lib/types";
import { inkOn } from "../ui";

/** 服の見た目: 写真があれば写真、なければ色ブロック */
export function ItemThumb({ item, className = "h-24" }: { item: WardrobeItem; className?: string }) {
  const photo = usePhoto(item.id, item.hasPhoto);
  const c = colorById(item.color);
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={`${c.label}の${subCategoryById(item.subCategory)?.label ?? "服"}`} className={`w-full object-cover ${className}`} />;
  }
  return (
    <div className={`flex w-full items-end p-2 text-sm font-bold ${className}`} style={{ background: c.hex, color: inkOn(c.hex) }}>
      {subCategoryById(item.subCategory)?.label}
    </div>
  );
}

const TONE = {
  ok: { bar: "bg-good", text: "text-good", icon: "🟢" },
  soon: { bar: "bg-warn", text: "text-warn", icon: "🟡" },
  replace: { bar: "bg-red-600", text: "text-red-600", icon: "🔴" },
} as const;

/** 傷み具合のメーター（色・アイコン・文字の3つで状態を伝える） */
export function LifeMeter({ life, compact = false }: { life: LifeInfo; compact?: boolean }) {
  const t = TONE[life.status];
  const pct = Math.min(100, Math.round(life.used * 100));
  return (
    <div>
      <div className={`flex items-center justify-between gap-1 font-bold ${compact ? "text-xs" : "text-sm"} ${t.text}`}>
        <span>
          <span aria-hidden>{t.icon}</span> {LIFE_STATUS_LABEL[life.status]}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="買い替え目安までの使用度">
        <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
      {!compact && <p className="mt-1 text-sm text-muted">{life.reason}</p>}
    </div>
  );
}
