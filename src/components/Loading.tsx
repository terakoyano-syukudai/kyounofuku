/** 端末内のデータを読み込むまでの仮表示 */
export function Loading({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div className="space-y-3 pt-2" aria-busy="true">
      <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface-2" />
      <p className="text-center text-xs text-muted">{label}</p>
    </div>
  );
}
