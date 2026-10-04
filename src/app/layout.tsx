import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/BottomNav";
import { Toaster } from "@/components/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "きょうの服",
  description: "体型・手持ち服・1日のタイムラインに合わせた服装提案",
  appleWebApp: { capable: true, title: "きょうの服", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        <main className="mx-auto w-full max-w-md px-4 pb-32 pt-5">{children}</main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
