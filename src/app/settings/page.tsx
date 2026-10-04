"use client";

import Link from "next/link";
import { Loading } from "@/components/Loading";
import { BackupSetting } from "@/components/settings/BackupSetting";
import { LocationSetting } from "@/components/settings/LocationSetting";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { BUDGET_CATEGORIES, CATEGORY_LABEL, yen } from "@/lib/constants";
import { rakutenEnabled } from "@/lib/shop/rakuten";
import { useAppData } from "@/lib/store";

export default function SettingsPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  const { user } = data;
  return (
    <div>
      <PageHeader title="設定" description="天気のエリア、体型・好み・予算、データのバックアップを管理します。" />

      <SectionTitle>天気のエリア</SectionTitle>
      <Card>
        <LocationSetting current={user.areaName} />
      </Card>

      <SectionTitle
        action={
          <Link href="/onboarding/" className="flex min-h-11 items-center rounded-full border-2 border-accent px-4 text-sm font-bold text-accent">
            編集
          </Link>
        }
      >
        体型・好み・予算
      </SectionTitle>
      <Card>
        <ul className="divide-y divide-line text-sm">
          {BUDGET_CATEGORIES.map((c) => (
            <li key={c} className="flex justify-between py-2">
              <span>{CATEGORY_LABEL[c]}</span>
              <span className="font-bold tabular-nums">{yen(user.budgets[c] ?? 0)} まで</span>
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle>データのバックアップ</SectionTitle>
      <Card>
        <BackupSetting />
      </Card>

      <SectionTitle>このアプリについて</SectionTitle>
      <Card className="space-y-2 text-xs leading-relaxed text-muted">
        <p>
          <b className="text-ink">完全無料・サーバーなし</b>：データはこの端末の中だけに保存し、タグの文字もこの端末の中で読み取ります（写真は外部に送りません）。
        </p>
        <p>
          買い足し候補: {rakutenEnabled() ? "楽天市場の商品を検索します" : "楽天のキーが未設定のため、サンプルカタログから提案します"}。天気: Open-Meteo。
        </p>
        <p>Chrome のメニュー「︙」→「ホーム画面に追加」で、アプリのように起動できます。</p>
      </Card>
    </div>
  );
}
