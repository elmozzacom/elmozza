// Service worker Elmozza English
//
// Dipertahankan di static/ (bukan src/service-worker.ts) karena sudah
// menangani Web Push yang berjalan di produksi. Memindahkannya berisiko
// memutus langganan push yang sudah terdaftar di peramban pengguna.
//
// Versi dinaikkan setiap kali strategi cache berubah, agar cache lama
// terhapus saat activate.
const VERSI = "v2";
const CACHE_SHELL = `elmozza-shell-${VERSI}`;
const CACHE_ISI = `elmozza-lessons-${VERSI}`;
const CACHE_MEDIA = `elmozza-audio-${VERSI}`;

// Seluruh cache milik aplikasi ini. Dipakai saat membersihkan versi lama.
const MILIK_KAMI = /^elmozza-(shell|lessons|audio)-/;

// Hanya halaman yang benar-benar dapat dibuka tanpa masuk akun.
// '/' dan '/learn' sengaja TIDAK dimasukkan: keduanya mengalihkan ke
// /start dan /login bagi pengunjung. Menyimpan hasil pengalihan membuat
// permintaan luring gagal, bukan tersaji dari cache.
const SHELL = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      // addAll gagal seluruhnya bila satu berkas gagal. Dipasang satu per satu
      // agar satu berkas yang hilang tidak membatalkan pemasangan.
      .then((cache) =>
        Promise.all(SHELL.map((u) => cache.add(u).catch(() => {}))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((kunci) =>
        Promise.all(
          kunci
            .filter((k) => MILIK_KAMI.test(k) && !k.endsWith(`-${VERSI}`))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Data yang harus selalu baru: jaringan dulu, cache hanya bila gagal.
  // Tanpa ini, papan peringkat dan kuis bisa menampilkan angka basi.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname.startsWith("/api/content/")) {
            const salin = res.clone();
            caches.open(CACHE_ISI).then((cache) => cache.put(req, salin));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error())),
    );
    return;
  }

  // Audio dan media: cache dulu, dan tidak pernah kedaluwarsa.
  // Berkas media bernama tetap, jadi aman disimpan selamanya.
  if (
    url.pathname.startsWith("/audio/") ||
    url.pathname.startsWith("/api/media/")
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const salin = res.clone();
              caches.open(CACHE_MEDIA).then((cache) => cache.put(req, salin));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Sisanya: cache dulu, lalu jaringan.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          // Pengalihan (login, /start) tidak pernah disimpan: yang tersimpan
          // hanyalah perintah berpindah, dan saat luring itu selalu gagal.
          const boleh =
            res.ok && res.type !== "opaqueredirect" && !res.redirected;
          if (
            boleh &&
            (url.pathname.startsWith("/learn") ||
              url.pathname.startsWith("/_app/"))
          ) {
            const salin = res.clone();
            caches.open(CACHE_ISI).then((cache) => cache.put(req, salin));
          }
          return res;
        })
        .catch(async () => {
          // Permintaan halaman yang gagal diarahkan ke halaman luring,
          // bukan ke '/' — agar pengguna tahu sedang tanpa jaringan.
          if (req.mode === "navigate") {
            const luring = await caches.match("/offline");
            if (luring) return luring;
          }
          return Response.error();
        });
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Elmozza English",
    body: "Your 5-minute lesson is ready. Keep the streak alive.",
    url: "/learn",
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* keep default */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url },
      icon: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/learn";
  event.waitUntil(self.clients.openWindow(url));
});
