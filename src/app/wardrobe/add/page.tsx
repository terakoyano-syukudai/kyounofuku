"use client";

import Link from "next/link";
import { Loading } from "@/components/Loading";
import { AddItemFlow } from "@/components/wardrobe/AddItemFlow";
import { allBrands, useAppData } from "@/lib/store";

export default function AddItemPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const brands = allBrands(data).map((b) => ({ name: b.name, aliases: b.aliases }));
  return (
    <div>
      <Link href="/wardrobe" className="mb-3 block px-1 text-sm text-muted">
        ‹ クローゼット
      </Link>
      <AddItemFlow brands={brands} />
    </div>
  );
}
