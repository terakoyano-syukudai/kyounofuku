"use client";

import { useRef, useState } from "react";
import { exportData, importData, resetAll } from "@/lib/store";
import { Button } from "../ui";

/** データはこの端末にしかないので、書き出し・読み込みで引っ越しやバックアップをする */
export function BackupSetting() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"import" | "reset" | null>(null);
  const [pendingJson, setPendingJson] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kyounofuku-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("バックアップファイルを保存しました（ダウンロードフォルダ）");
  };

  return (
    <div>
      <p className="text-xs leading-relaxed text-muted">
        服や体型のデータはこの端末の中だけに保存されています。機種変更やブラウザのデータ削除に備えて、ときどき書き出しておくと安心です。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={download}>
          書き出す
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          読み込む
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setPendingJson(await f.text());
          setConfirm("import");
        }}
      />

      {confirm && (
        <div className="mt-3 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-sm">
          <p>{confirm === "import" ? "今のデータを、読み込んだファイルの内容に置き換えます。よろしいですか？" : "この端末のデータをすべて消して、最初からやり直します。よろしいですか？"}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirm(null);
                setPendingJson(null);
              }}
            >
              やめる
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm === "import" && pendingJson) {
                  const r = importData(pendingJson);
                  setMsg(r.ok ? `読み込みました（服 ${r.items}着）` : r.error);
                } else if (confirm === "reset") {
                  resetAll();
                  setMsg("データを消去しました");
                }
                setConfirm(null);
                setPendingJson(null);
              }}
            >
              {confirm === "import" ? "置き換える" : "消去する"}
            </Button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}

      <button type="button" className="mt-4 text-xs text-red-600 underline" onClick={() => setConfirm("reset")}>
        すべてのデータを消去
      </button>
    </div>
  );
}
