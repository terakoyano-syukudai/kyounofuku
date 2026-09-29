import type { NextConfig } from "next";

// GitHub Pages の https://<ユーザー名>.github.io/<リポジトリ名>/ に置くため、公開用ビルドではサブパスを付ける
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export", // サーバーなしの静的サイトとして書き出す（out/）
  basePath,
  trailingSlash: true, // /wardrobe/ → wardrobe/index.html（GitHub Pages で404にならないように）
  images: { unoptimized: true },
};

export default nextConfig;
