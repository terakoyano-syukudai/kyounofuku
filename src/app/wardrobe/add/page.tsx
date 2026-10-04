"use client";

import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/ui";
import { AddItemFlow } from "@/components/wardrobe/AddItemFlow";
import { allBrands, useAppData } from "@/lib/store";

export default function AddItemPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const brands = allBrands(data).map((b) => ({ name: b.name, aliases: b.aliases }));
  return (
    <div>
      <PageHeader
        title="服を登録"
        description="写真とタグから自動で入力できます。どちらも任意で、手入力だけでも登録できます。"
        back={{ href: "/wardrobe/", label: "クローゼット" }}
      />
      <AddItemFlow brands={brands} />
    </div>
  );
}
