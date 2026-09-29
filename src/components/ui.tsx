// 小さな共通 UI 部品
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-4 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between px-1">
      <h2 className="text-sm font-bold tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Chip({
  active,
  children,
  className = "",
  ...rest
}: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm transition active:scale-95 ${
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: { variant?: "primary" | "ghost" | "danger"; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-accent text-accent-ink",
    ghost: "border border-line bg-surface text-ink",
    danger: "border border-red-400/50 bg-surface text-red-600",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LabeledSlider({
  label,
  left,
  right,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  display,
}: {
  label: string;
  left?: string;
  right?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
}) {
  return (
    <label className="block py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold">{label}</span>
        {display && <span className="text-sm font-bold tabular-nums text-accent">{display}</span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      {(left || right) && (
        <div className="-mt-1 flex justify-between text-xs text-muted">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </label>
  );
}

/** 背景色に対して読みやすい文字色 */
export function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? "#1d1b19" : "#ffffff";
}
