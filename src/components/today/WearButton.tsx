"use client";

import { logWear } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Button } from "../ui";

export function WearButton({ date, itemIds, worn }: { date: string; itemIds: string[]; worn: boolean }) {
  if (worn) {
    return <div className="flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-good/40 bg-good/10 px-2 text-center text-base font-bold text-good">✓ 記録済み</div>;
  }
  return (
    <Button className="w-full whitespace-nowrap !px-3" disabled={!itemIds.length} onClick={() => (logWear(date, itemIds), toast("今日のコーデを記録しました（着用回数に加算）"))}>
      👕 これを着る
    </Button>
  );
}
