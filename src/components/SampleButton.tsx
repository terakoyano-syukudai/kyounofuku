"use client";

import { addSampleWardrobe } from "@/lib/store";
import { Button } from "./ui";

export function SampleButton({ variant = "ghost" }: { variant?: "primary" | "ghost" }) {
  return (
    <Button variant={variant} className="w-full" onClick={() => addSampleWardrobe()}>
      サンプルの服13着で試す
    </Button>
  );
}
