import type { MetadataRoute } from "next"

type PwaManifest = MetadataRoute.Manifest & {
  display_override?: Array<"standalone" | "minimal-ui" | "browser">
}

export default function manifest(): PwaManifest {
  return {
    id: "/dashboard",
    name: "QMS-MANAJA",
    short_name: "QMS-MANAJA",
    description: "Industrial compliance, simplified",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0D2B55",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
