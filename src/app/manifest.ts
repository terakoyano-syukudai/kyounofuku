import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "きょうの服",
    short_name: "きょうの服",
    description: "体型・手持ち服・1日のタイムラインに合わせた服装提案",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#f6f4f0",
    theme_color: "#f6f4f0",
    lang: "ja",
    icons: [{ src: `${BASE}/icon.svg`, sizes: "any", type: "image/svg+xml" }],
  };
}
