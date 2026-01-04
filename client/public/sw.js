// Service Worker with safe caching strategy
// Version changes on each deploy to trigger iOS PWA updates
const SW_VERSION = "2026-01-04T14-42-52"; // Change this on each deploy
const RUNTIME_CACHE = `runtime-${SW_VERSION}`;

// Take control fast - apply updates immediately
self.addEventListener("install", (event) => {
  console.log(`[SW ${SW_VERSION}] Installing service worker`);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log(`[SW ${SW_VERSION}] Activating service worker`);
  event.waitUntil((async () => {
    // Delete all old caches
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== RUNTIME_CACHE).map(k => {
        console.log(`[SW ${SW_VERSION}] Deleting old cache:`, k);
        return caches.delete(k);
      })
    );
    // Take control of all pages immediately
    await self.clients.claim();
    console.log(`[SW ${SW_VERSION}] Now controlling all pages`);
  })());
});

// Listen for skip waiting message from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log(`[SW ${SW_VERSION}] Received SKIP_WAITING message`);
    self.skipWaiting();
  }
});

// Fetch handler with intelligent caching
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first for HTML navigations (always get fresh content)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        console.log(`[SW ${SW_VERSION}] Fetching fresh HTML:`, url.pathname);
        const fresh = await fetch(req, { cache: "no-store" });
        
        // Cache the HTML for offline fallback
        if (fresh.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put("/", fresh.clone());
        }
        
        return fresh;
      } catch (error) {
        console.error(`[SW ${SW_VERSION}] Network failed for navigation, trying cache:`, error);
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match("/");
        return cached || Response.error();
      }
    })());
    return;
  }

  // Network-first for API requests (always get fresh data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        
        // Optionally cache successful API responses for offline fallback
        if (response.ok && (
          url.pathname.includes("/recipes") ||
          url.pathname.includes("/meals") ||
          url.pathname.includes("/meal-plans")
        )) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, response.clone());
        }
        
        return response;
      } catch (error) {
        // Serve from cache if offline
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // Cache-first ONLY for content-hashed assets (Vite uses dash-separated: index-79f5f7b4.js)
  // These never change, so caching them is safe
  if (/[-.]([a-f0-9]{8,})\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      
      if (cached) {
        console.log(`[SW ${SW_VERSION}] Serving hashed asset from cache:`, url.pathname);
        return cached;
      }
      
      const resp = await fetch(req);
      if (resp.ok) {
        console.log(`[SW ${SW_VERSION}] Caching hashed asset:`, url.pathname);
        cache.put(req, resp.clone());
      }
      return resp;
    })());
    return;
  }

  // Network-first for everything else (including non-hashed JS/CSS)
  event.respondWith((async () => {
    try {
      const response = await fetch(req);
      
      // Cache static assets for offline fallback
      if (response.ok && /\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|eot|json)$/i.test(url.pathname)) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, response.clone());
      }
      
      return response;
    } catch (error) {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      return cached || Response.error();
    }
  })());
});
