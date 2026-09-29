"use client";

import { logWear } from "@/lib/store";
import { Button } from "../ui";

export function WearButton({ date, itemIds, worn }: { date: string; itemIds: string[]; worn: boolean }) {
  if (worn) {
    return <div className="rounded-2xl bg-good/15 py-3 text-center text-sm font-bold text-good">✓ 今日のコーデとして記録しました</div>;
  }
  return (
    <Button className="w-full" disabled={!itemIds.length} onClick={() => logWear(date, itemIds)}>
      これを着る
    </Button>
  );
}
