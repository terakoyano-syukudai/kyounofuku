"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "きょう", icon: "👕" },
  { href: "/plan/", label: "予定", icon: "🗓️" },
  { href: "/wardrobe/", label: "クローゼット", icon: "🧺" },
  { href: "/settings/", label: "設定", icon: "⚙️" },
];

export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/onboarding")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.06)]" aria-label="メインメニュー">
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-1.5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href.replace(/\/$/, ""));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-bold ${
                  active ? "bg-accent/15 text-accent" : "text-muted"
                }`}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
