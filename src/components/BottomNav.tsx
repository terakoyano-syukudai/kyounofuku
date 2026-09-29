"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "きょう", icon: "☀︎" },
  { href: "/plan", label: "予定", icon: "◷" },
  { href: "/wardrobe", label: "クローゼット", icon: "▦" },
  { href: "/settings", label: "設定", icon: "⚙︎" },
];

export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/onboarding")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? "font-bold text-accent" : "text-muted"}`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
