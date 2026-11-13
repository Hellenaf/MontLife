// MontLife Service Worker — Offline Cache & Native Web Push Notifications
const CACHE_NAME = "montlife-cache-v2";

const STATIC_PRECACHE = [
  "/",
  "/manifest.json",
  "/favicon-32x32.png",
  "/icon-192x192.png",
  "/brand-logo-square.png",
];

// Install: Cache critical shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] Pre-cache failed:", err))
  );
});

// Activate: Clean up outdated caches & claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first for dynamic & API calls, cache fallback for navigation & static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass chrome-extension and non-GET requests
  if (req.method !== "GET" || url.protocol.startsWith("chrome-extension")) {
    return;
  }

  // API calls: Network-first, do not aggressively cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline: sem conexão com o servidor." }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Navigation requests (HTML pages): Network-first with cached root fallback for offline access
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(async () => {
          const cachedRoot = await caches.match("/");
          if (cachedRoot) return cachedRoot;
          return caches.match(req);
        })
    );
    return;
  }

  // Static assets (scripts, styles, icons, fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Web Push Events
self.addEventListener("push", (event) => {
  let payload = {
    title: "Lembrete MontLife",
    body: "Você tem um compromisso ou demanda agendada.",
    url: "/",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: "/icon-192x192.png",
    badge: "/favicon-32x32.png",
    vibrate: [200, 100, 200, 100, 250],
    tag: payload.tag || "montlife-scheduled-reminder",
    renotify: true,
    data: {
      url: payload.url || "/",
      taskId: payload.taskId,
    },
    actions: [
      { action: "open", title: "Abrir Demanda" },
      { action: "dismiss", title: "Dispensar" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Notification Click: Focus existing window or open app directly
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({
              type: "NOTIFICATION_CLICKED",
              taskId: event.notification.data?.taskId,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Message listener from web app (allows triggering native background notification)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_NOTIFICATION") {
    const { title, body, tag, taskId } = event.data;
    self.registration.showNotification(title || "Lembrete MontLife", {
      body: body || "Seu compromisso está começando.",
      icon: "/icon-192x192.png",
      badge: "/favicon-32x32.png",
      vibrate: [200, 100, 200],
      tag: tag || "montlife-local-reminder",
      renotify: true,
      data: {
        url: "/",
        taskId,
      },
      actions: [
        { action: "open", title: "Abrir Demanda" },
        { action: "dismiss", title: "Dispensar" },
      ],
    });
  }
});

