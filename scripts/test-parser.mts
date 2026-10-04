// タグ文字列の解析テスト: node scripts/test-parser.mts
import { parseTagText } from "../src/lib/ai/parse-tag-text.ts";

const brands = [
  { name: "UNIQLO", aliases: ["ユニクロ"] },
  { name: "BEAMS", aliases: ["ビームス"] },
];
const cases: { name: string; text: string; materials: string; brand?: string; size?: string; care?: string[] }[] = [
  { name: "OCRの空白入り・行またぎ", text: "UNIQLO\n\nサイ ズ M\n\n綿 60%\n\nポリ エス テル 40%\n\n中 国 製\n\n漂白 剤 は 使用 し な いで くだ さい\n陰 千 し し て くだ さい", materials: "綿60 ポリエステル40", brand: "UNIQLO", size: "M", care: ["no_bleach", "shade_dry"] },
  { name: "1行に2素材", text: "綿 60% ポリエステル 40%", materials: "綿60 ポリエステル40" },
  { name: "海外タグ（%が先）", text: "ACNE STUDIOS\n100% COTTON\nMADE IN PORTUGAL\nSIZE M", materials: "綿100", brand: "ACNE STUDIOS", size: "M" },
  { name: "Galaxyのテキスト抽出風", text: "品質表示\n表地 ポリエステル100%\n裏地 キュプラ100%\n液温は40℃を限度とし、洗濯機で弱い洗濯ができる\n日陰のつり干しがよい\n株式会社ユニクロ", materials: "ポリエステル100", brand: "UNIQLO", care: ["shade_dry", "hang_dry", "wash_40"] },
  { name: "60%綿 40%ポリ", text: "60%綿 40%ポリエステル\nサイズ L", materials: "綿60 ポリエステル40", size: "L" },
  { name: "表地/裏地", text: "BEAMS\n表地 毛 80% ナイロン 20%\n裏地 キュプラ 100%", materials: "ウール80 ナイロン20", brand: "BEAMS" },
  { name: "読めない", text: "@@ ### ~~", materials: "" },
  { name: "崩れた読み取り（ブランドを誤検出しない）", text: "っ\n科\nnN\nVv\nOxgHaro\nZY © HOH\nSPER EE", materials: "", brand: "" },
];

let failed = 0;
for (const c of cases) {
  const r = parseTagText(c.text, brands);
  const got = r.materials.map((m) => m.name + m.pct).join(" ");
  const errs: string[] = [];
  if (got !== c.materials) errs.push(`素材 ${got} ≠ ${c.materials}`);
  if (c.brand !== undefined && r.brand !== c.brand) errs.push(`ブランド ${r.brand} ≠ ${c.brand}`);
  if (c.size !== undefined && r.size !== c.size) errs.push(`サイズ ${r.size} ≠ ${c.size}`);
  if (c.care && [...r.care_symbols].sort().join() !== [...c.care].sort().join()) errs.push(`洗濯 ${r.care_symbols} ≠ ${c.care}`);
  console.log(`${errs.length ? "NG" : "OK"} ${c.name}${errs.length ? ` — ${errs.join(" / ")}` : ""}`);
  if (errs.length) failed++;
}
console.log(`${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
