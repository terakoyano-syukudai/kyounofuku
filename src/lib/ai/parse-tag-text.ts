// OCR で読み取ったタグの文字列から、素材・サイズ・ブランド・洗濯表示を取り出す（無料モード用）
// 依存なしの純粋関数にしてあるので、単体でテストできる

export type BrandRef = { name: string; aliases: string[] };

export type ParsedTag = {
  brand: string;
  sub_category: string | null;
  size: string;
  materials: { name: string; pct: number }[];
  care_symbols: string[];
  country_of_origin: string;
  confidence: number;
  found: string[]; // 読み取れた項目（UI 表示用）
};

// 品質表示でよく使われる素材名 → 表記の統一
const MATERIALS: [RegExp, string][] = [
  [/綿|コットン|cotton/i, "綿"],
  [/ポリエステル|polyester/i, "ポリエステル"],
  [/ナイロン|nylon|ポリアミド/i, "ナイロン"],
  [/毛|ウール|wool/i, "ウール"],
  [/カシミヤ|cashmere/i, "カシミヤ"],
  [/レーヨン|rayon|ビスコース/i, "レーヨン"],
  [/アクリル|acrylic/i, "アクリル"],
  [/ポリウレタン|polyurethane|スパンデックス|エラスタン/i, "ポリウレタン"],
  [/麻|リネン|linen/i, "リネン"],
  [/絹|シルク|silk/i, "シルク"],
  [/キュプラ|cupro/i, "キュプラ"],
  [/テンセル|リヨセル|lyocell/i, "リヨセル"],
  [/モダール|modal/i, "モダール"],
  [/アセテート/i, "アセテート"],
  [/指定外繊維/i, "指定外繊維"],
];

// 取扱い表示の文章 → 洗濯表示ID
const CARE_PHRASES: [RegExp, string][] = [
  [/手洗い/, "hand_wash"],
  [/(水洗い|家庭洗濯).{0,6}(でき|不可|禁止)/, "no_wash"],
  [/漂白.{0,8}(使用しない|使えない|でき(ません|ない)|不可|禁止|避け)/, "no_bleach"],
  [/タンブル.{0,10}(避け|しない|でき(ません|ない)|不可|禁止)/, "no_tumble"],
  [/タンブル.{0,6}(低温|60)/, "tumble_low"],
  [/陰[干千]し|日陰/, "shade_dry"], // OCR は「干」を「千」と読みがち
  [/平[干千]し/, "flat_dry"],
  [/[つ吊]り[干千]し/, "hang_dry"],
  [/アイロン.{0,8}(低温|110)/, "iron_low"],
  [/アイロン.{0,8}(中温|150)/, "iron_mid"],
  [/アイロン.{0,8}(不可|禁止|かけない|でき(ません|ない))/, "no_iron"],
  [/ドライ(クリーニング)?.{0,6}(でき(ます|る)|可)/, "dry_clean"],
  [/ドライ(クリーニング)?.{0,6}(でき(ません|ない)|不可|禁止)/, "no_dry_clean"],
];

// 下げ札などに書かれたアイテム名 → サブカテゴリ
const SUB_WORDS: [RegExp, string][] = [
  [/カーディガン|cardigan/i, "cardigan"],
  [/ダウン|down\s*jacket/i, "down"],
  [/コート|coat/i, "coat"],
  [/マウンテンパーカ/i, "mountain_parka"],
  [/ジャケット|jacket|ブレザー/i, "tailored"],
  [/パーカ|フーディ|hoodie/i, "hoodie"],
  [/スウェット|sweat/i, "sweat"],
  [/ニット|セーター|knit|sweater/i, "knit"],
  [/ブラウス|blouse/i, "blouse"],
  [/ポロ|polo/i, "polo"],
  [/シャツ|shirt/i, "shirt"],
  [/[TＴ]シャツ|tee|t-shirt/i, "tshirt"],
  [/デニム|ジーンズ|jeans|denim/i, "denim"],
  [/スラックス|slacks|trousers/i, "slacks"],
  [/チノ|chino/i, "chino"],
  [/カーゴ|cargo/i, "cargo"],
  [/ショーツ|ショートパンツ|shorts/i, "shorts"],
  [/スカート|skirt/i, "skirt"],
  [/スニーカー|sneaker/i, "sneakers"],
];

/** OCR は日本語の文字の間に空白を入れがちなので詰め、全角英数を半角に */
export function normalizeOcr(text: string): string {
  return text
    .replace(/[Ａ-Ｚａ-ｚ０-９％：]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/(?<=[぀-ヿ一-鿿])[ \t]+(?=[぀-ヿ一-鿿%\d])/g, "")
    .replace(/(?<=\d)[ \t]+(?=%)/g, "")
    .replace(/[|｜]/g, " ");
}

const norm = (s: string) => s.toLowerCase().replace(/[\s・.'’\-_&]/g, "");

export function parseTagText(raw: string, brands: BrandRef[]): ParsedTag {
  const text = normalizeOcr(raw);
  const found: string[] = [];

  // 素材: 裏地・付属の表示より前（表地）を優先
  const body = text.split(/裏地|別布|付属|リブ部分/)[0];
  const materials: { name: string; pct: number }[] = [];
  const re = /([^\s\d%:：,、]{1,12})\s*[:：]?\s*(\d{1,3})\s*%/g;
  for (const m of body.matchAll(re)) {
    const hit = MATERIALS.find(([r]) => r.test(m[1]));
    const pct = Number(m[2]);
    if (hit && pct > 0 && pct <= 100 && !materials.some((x) => x.name === hit[1])) materials.push({ name: hit[1], pct });
  }
  const total = materials.reduce((a, m) => a + m.pct, 0);
  if (materials.length && total >= 95 && total <= 105) found.push("素材");
  else if (materials.length) found.push("素材（合計が100%になっていません）");

  // サイズ
  let size = "";
  const labeled = text.match(/サイズ\s*[:：]?\s*([A-Za-z0-9/.\-]{1,10})/);
  const wl = text.match(/\bW\s?(\d{2})\s*L\s?(\d{2})\b/i);
  const letter = text.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|[2-4]XL|FREE)\b/);
  if (wl) size = `W${wl[1]} L${wl[2]}`;
  else if (labeled) size = labeled[1];
  else if (letter) size = letter[1];
  if (size) found.push("サイズ");

  // ブランド: マスタに登録された名前・別名で照合（長い一致を優先）
  const hay = norm(text);
  let brand = "";
  let best = 0;
  for (const b of brands) {
    for (const n of [b.name, ...b.aliases]) {
      const k = norm(n);
      if (k.length >= 2 && k.length > best && hay.includes(k)) {
        brand = b.name;
        best = k.length;
      }
    }
  }
  if (brand) found.push("ブランド");

  // 洗濯表示（記号は読めないので、取扱い注意の文章から拾う）
  const care = [...new Set(CARE_PHRASES.filter(([r]) => r.test(text)).map(([, id]) => id))];
  // 「40」「30」の数字は洗濯の文脈のときだけ採用
  const washTemp = text.match(/(洗濯|液温).{0,8}(40|30)/);
  if (washTemp && !care.includes("hand_wash") && !care.includes("no_wash")) care.push(washTemp[2] === "40" ? "wash_40" : "wash_30");
  if (care.length) found.push("洗濯表示（文章から）");

  const sub = SUB_WORDS.find(([r]) => r.test(text))?.[1] ?? null;
  if (sub) found.push("アイテム種別");

  const country = text.match(/([一-鿿゠-ヿ]{2,6})製/)?.[1] ?? text.match(/made\s+in\s+([a-z ]{3,20})/i)?.[1]?.trim() ?? "";

  const score = [materials.length > 0, !!size, !!brand, care.length > 0].filter(Boolean).length;
  return { brand, sub_category: sub, size, materials, care_symbols: care, country_of_origin: country, confidence: score / 4, found };
}
