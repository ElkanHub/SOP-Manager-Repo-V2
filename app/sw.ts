import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import {
  CacheFirst,
  ExpirationPlugin,
  CacheableResponsePlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist"

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// SKIP_WAITING is driven by the window via postMessage so the user gets a
// chance to consent to the update via an in-app toast.
self.addEventListener("message", (event) => {
  if ((event as ExtendableMessageEvent).data?.type === "SKIP_WAITING") {
    void self.skipWaiting()
  }
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Static assets (images, fonts, icons)
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff|woff2|ttf|eot)$/i,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Next.js static chunks
    {
      matcher: /^\/_next\/static\/.*/i,
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 256,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Next.js image optimization
    {
      matcher: /^\/_next\/image\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Never cache auth — must always hit the network for fresh sessions
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith("/api/auth") ||
        url.pathname.includes("/auth/v1/"),
      handler: new NetworkOnly(),
    },

    // Never cache cron endpoints or server-only API mutations
    {
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        url.pathname.startsWith("/api/cron") ||
        request.method !== "GET",
      handler: new NetworkOnly(),
    },

    // App navigation: stale-while-revalidate so previously visited pages still render offline
    {
      matcher: ({ request }: { request: Request }) =>
        request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Supabase REST reads — network first, short-cache fallback
    {
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        /supabase\.co$/i.test(url.hostname) &&
        url.pathname.startsWith("/rest/") &&
        request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "supabase-rest",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 5 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Supabase Storage (signed file URLs) — cache aggressively, content-addressed
    {
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        /supabase\.co$/i.test(url.hostname) &&
        url.pathname.includes("/storage/") &&
        request.method === "GET",
      handler: new CacheFirst({
        cacheName: "supabase-storage",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Google Fonts
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }: { request: Request }) =>
          request.destination === "document",
      },
    ],
  },
})

serwist.addEventListeners()
