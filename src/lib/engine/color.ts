// 色の調和スコア。無彩色（黒白グレー紺ベージュ）は何とでも合う前提
import { NEUTRAL_COLORS, colorById } from "../constants";

const EARTH = ["brown", "khaki", "beige", "green"];

function hue(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

export function colorHarmony(colors: string[]): { score: number; note: string | null } {
  const accents = [...new Set(colors.filter((c) => !NEUTRAL_COLORS.includes(c)))];
  if (accents.length === 0) return { score: 4, note: "無彩色でまとめた失敗しない配色" };
  if (accents.length === 1) return { score: 6, note: `${colorById(accents[0]).label}を差し色にした配色` };
  if (accents.length === 2) {
    if (accents.every((c) => EARTH.includes(c))) return { score: 3, note: "アースカラーでまとめた配色" };
    const d = Math.abs(hue(colorById(accents[0]).hex) - hue(colorById(accents[1]).hex));
    const diff = Math.min(d, 360 - d);
    if (diff <= 40) return { score: 2, note: "同系色でまとめた配色" };
    return { score: -6, note: null };
  }
  return { score: -12, note: null };
}
