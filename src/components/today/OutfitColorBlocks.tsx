// 今日のコーデを「色のブロック」で人型に並べて一目でわかるようにする
import { colorById, subCategoryById } from "@/lib/constants";
import type { Outfit } from "@/lib/engine/outfit";
import type { WardrobeItem } from "@/lib/types";
import { inkOn } from "../ui";

const hex = (i: WardrobeItem | null, fallback = "transparent") => (i ? colorById(i.color).hex : fallback);

function Figure({ o }: { o: Outfit }) {
  const top = hex(o.top, "var(--surface-2)");
  const bottom = hex(o.bottom, "var(--surface-2)");
  const shoes = hex(o.shoes, "var(--surface-2)");
  const outer = o.outer ? hex(o.outer) : null;
  const isShort = o.bottom && ["shorts", "skirt"].includes(o.bottom.subCategory);
  const ring = "0 0 0 1px rgb(0 0 0 / 0.08) inset";

  return (
    <div className="relative mx-auto h-[250px] w-[132px] origin-left scale-[0.79]" aria-hidden>
      {/* 頭 */}
      <div className="absolute left-1/2 top-0 h-9 w-9 -translate-x-1/2 rounded-full bg-surface-2" />
      {/* 羽織り（前開き） */}
      {outer && (
        <>
          <div className="absolute left-0 top-10 h-[98px] w-[48px] rounded-l-[22px] rounded-tr-md" style={{ background: outer, boxShadow: ring }} />
          <div className="absolute right-0 top-10 h-[98px] w-[48px] rounded-r-[22px] rounded-tl-md" style={{ background: outer, boxShadow: ring }} />
        </>
      )}
      {/* トップス */}
      <div
        className={`absolute top-10 h-[92px] rounded-t-[26px] rounded-b-lg ${outer ? "left-[30px] w-[72px]" : "left-2 w-[116px]"}`}
        style={{ background: top, boxShadow: ring }}
      />
      {/* ボトムス */}
      <div className="absolute left-[26px] top-[134px] flex w-[80px] gap-1">
        <div className={`${isShort ? "h-[46px]" : "h-[84px]"} flex-1 rounded-b-xl rounded-tl-md`} style={{ background: bottom, boxShadow: ring }} />
        <div className={`${isShort ? "h-[46px]" : "h-[84px]"} flex-1 rounded-b-xl rounded-tr-md`} style={{ background: bottom, boxShadow: ring }} />
      </div>
      {/* 靴 */}
      <div className="absolute left-[18px] top-[224px] flex w-[96px] justify-between">
        <div className="h-[20px] w-[42px] rounded-full" style={{ background: shoes, boxShadow: ring }} />
        <div className="h-[20px] w-[42px] rounded-full" style={{ background: shoes, boxShadow: ring }} />
      </div>
    </div>
  );
}

function Row({ role, item }: { role: string; item: WardrobeItem | null }) {
  if (!item) return null;
  const c = colorById(item.color);
  return (
    <li className="flex min-w-0 items-center gap-3">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
        style={{ background: c.hex, color: inkOn(c.hex), boxShadow: "0 0 0 1px rgb(0 0 0 / 0.08) inset" }}
      >
        {role}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-base font-bold leading-snug">
          {c.label}の{subCategoryById(item.subCategory)?.label}
        </span>
        <span className="block break-words text-sm leading-snug text-muted">{item.brandName ?? "ブランド不明"}</span>
      </span>
    </li>
  );
}

export function OutfitColorBlocks({ outfit }: { outfit: Outfit }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3">
      <Figure o={outfit} />
      <ul className="space-y-3">
        <Row role="羽織" item={outfit.outer} />
        <Row role="上" item={outfit.top} />
        <Row role="下" item={outfit.bottom} />
        <Row role="靴" item={outfit.shoes} />
        <Row role="鞄" item={outfit.bag} />
      </ul>
    </div>
  );
}
