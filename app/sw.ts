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

  interface ServiceWorkerRegistration {
    setAppBadge?: (contents?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
}

declare const self: ServiceWorkerGlobalScope

type PushNotificationPayload = {
  title?: string
  body?: string
  url?: string
  tag?: string
  badgeCount?: number
}

// SKIP_WAITING is driven by the window via postMessage so the user gets a
// chance to consent to the update via an in-app toast.
self.addEventListener("message", (event) => {
  if ((event as ExtendableMessageEvent).data?.type === "SKIP_WAITING") {
    void self.skipWaiting()
  }
})

self.addEventListener("push", (event) => {
  const pushEvent = event as PushEvent
  let payload: PushNotificationPayload = {}

  try {
    payload = pushEvent.data?.json() as PushNotificationPayload
  } catch {
    payload = {
      title: "QMS-MANAJA",
      body: pushEvent.data?.text() || "You have a new update.",
      url: "/dashboard",
    }
  }

  const title = payload.title || "QMS-MANAJA"
  const targetUrl = payload.url || "/dashboard"
  const options: NotificationOptions = {
    body: payload.body || "You have a new update.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: payload.tag,
    data: { url: targetUrl },
  }

  pushEvent.waitUntil((async () => {
    if (typeof payload.badgeCount === "number") {
      if (payload.badgeCount > 0) {
        await self.registration.setAppBadge?.(payload.badgeCount)
      } else {
        await self.registration.clearAppBadge?.()
      }
    }

    await self.registration.showNotification(title, options)
  })())
})

self.addEventListener("notificationclick", (event) => {
  const notificationEvent = event as NotificationEvent
  notificationEvent.notification.close()

  const targetUrl = new URL(
    String(notificationEvent.notification.data?.url || "/dashboard"),
    self.location.origin
  ).href

  notificationEvent.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    })

    for (const client of clientList) {
      if ("focus" in client && client.url === targetUrl) {
        return client.focus()
      }
    }

    return self.clients.openWindow(targetUrl)
  })())
})

// Pages we explicitly want available with no network, on top of whatever the
// build manifest already includes. The offline fallback in particular is never
// visited during normal browsing, so without forcing it into the precache the
// fallback handler has nothing to serve and the OS shows its default error.
const ADDITIONAL_PRECACHE = [
  { url: "/offline", revision: "1" },
]

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    ...ADDITIONAL_PRECACHE,
  ],
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
