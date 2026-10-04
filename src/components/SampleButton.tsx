"use client";

import { addSampleWardrobe } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Button } from "./ui";

export function SampleButton({ variant = "ghost" }: { variant?: "primary" | "ghost" }) {
  return (
    <Button variant={variant} className="w-full" onClick={() => (addSampleWardrobe(), toast("サンプルの服を13着追加しました"))}>
      サンプルの服13着で試す
    </Button>
  );
}
