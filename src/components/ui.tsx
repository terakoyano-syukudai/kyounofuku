// 小さな共通 UI 部品（スマホで押しやすいよう、タップできる要素は高さ44px以上）
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-4 shadow-sm ${className}`}>{children}</section>;
}

/** 各画面の見出し。何の画面か・何ができるかを一言で示す */
export function PageHeader({ title, description, back }: { title: string; description?: string; back?: { href: string; label: string } }) {
  return (
    <header className="mb-4 px-1">
      {back && (
        <Link href={back.href} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-base font-bold text-muted">
          ‹ {back.label}
        </Link>
      )}
      <h1 className="text-2xl font-black leading-tight">{title}</h1>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
    </header>
  );
}

/** 画面内の区切り見出し（番号・アイコン付き） */
export function SectionTitle({ children, action, icon, description }: { children: ReactNode; action?: ReactNode; icon?: string; description?: string }) {
  return (
    <div className="mb-3 mt-8 px-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-black">
          {icon && <span aria-hidden>{icon}</span>}
          {children}
        </h2>
        {action}
      </div>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
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
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full border-2 px-4 text-[15px] font-medium transition active:scale-95 ${
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink"
      } ${className}`}
      {...rest}
    >
      {active && <span aria-hidden>✓</span>}
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
    primary: "bg-accent text-accent-ink shadow-sm",
    ghost: "border-2 border-line bg-surface text-ink",
    danger: "border-2 border-red-500/50 bg-surface text-red-600",
  }[variant];
  return (
    <button
      className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold transition active:scale-[0.98] disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** 状態を色とアイコンと文字の3つで伝えるお知らせ枠 */
export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn" | "error"; children: ReactNode }) {
  const t = {
    info: { icon: "ℹ️", cls: "border-line bg-surface-2" },
    success: { icon: "✅", cls: "border-good/40 bg-good/10" },
    warn: { icon: "⚠️", cls: "border-warn/50 bg-warn/10" },
    error: { icon: "⛔", cls: "border-red-500/50 bg-red-500/10" },
  }[tone];
  return (
    <div className={`flex gap-2 rounded-2xl border-2 p-3 text-sm leading-relaxed ${t.cls}`} role={tone === "error" ? "alert" : "status"}>
      <span aria-hidden>{t.icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
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
        <span className="text-base font-bold">{label}</span>
        {display && <span className="text-base font-bold tabular-nums text-accent">{display}</span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      {(left || right) && (
        <div className="-mt-1 flex justify-between text-sm text-muted">
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
