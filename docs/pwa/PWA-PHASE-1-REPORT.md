# PWA PHASE 1 — LAPORAN

**Tanggal:** 18 September 2026
**Repo:** `projects/elmozza` — cabang `main`
**Lingkup:** aplikasi dapat dipasang + kerangka bekerja tanpa jaringan. Belum ada konten dialog.

---

## RINGKASAN

Phase 1 selesai. Tiga berkas disentuh, satu berkas baru dibuat.

Karena audit Phase 0 menemukan PWA sudah terpasang (manifest, ikon, service
worker, pendaftaran), pekerjaan Phase 1 berubah dari *membangun* menjadi
*memperbaiki*. Dan saat pengujian, ditemukan **satu cacat nyata pada service
worker lama** yang membuat aplikasi gagal total saat tanpa jaringan.

---

## 1. Berkas yang berubah

| Berkas | Tindakan |
|---|---|
| `static/sw.js` | diperbaiki menyeluruh — lihat bagian 2 |
| `src/routes/+layout.svelte` | tambah 4 baris: `apple-touch-icon` + meta iOS |
| `src/routes/offline/+page.svelte` | **baru** — halaman cadangan tanpa jaringan |
| `docs/pwa/PWA-PHASE-0-AUDIT.md` | **baru** — laporan audit |
| `docs/pwa/PWA-PHASE-1-REPORT.md` | **baru** — berkas ini |

Tidak ada pustaka baru dipasang. Tidak ada `vite-plugin-pwa`, tidak ada Workbox.
Service worker tetap ditulis tangan.

---

## 2. Cacat yang ditemukan saat pengujian

### 2.1 Aplikasi gagal total tanpa jaringan — CACAT UTAMA

Service worker lama menyimpan `'/'` dan `'/learn'` sebagai kerangka aplikasi.
Kedua alamat itu **mengalihkan** bagi pengunjung yang belum masuk akun:

```
/        →  303  →  /start
/learn   →  303  →  /login
```

Yang tersimpan di cache bukan halaman, melainkan **perintah berpindah**. Saat
tanpa jaringan, perintah itu dijalankan, tujuannya tidak ada di cache, dan
permintaan gagal.

Terbukti pada pengujian pertama:

```
Page.goto: net::ERR_FAILED at http://127.0.0.1:4173/learn
```

Bukan halaman cadangan yang muncul — melainkan galat peramban. Aplikasi tidak
dapat dipakai sama sekali tanpa jaringan, padahal justru itu tujuan PWA.

**Perbaikan:** kerangka hanya memuat alamat yang benar-benar dapat dibuka tanpa
masuk akun, dan hasil pengalihan tidak pernah disimpan.

```js
const SHELL = ['/offline', '/manifest.webmanifest', '/icons/icon-192.png'];

const boleh = res.ok && res.type !== 'opaqueredirect' && !res.redirected;
```

### 2.2 Cache lama tidak pernah dibersihkan

Tidak ada penghapusan saat `activate`. Setiap penerapan baru menambah berkas
tanpa membuang yang lama — ruang penyimpanan peramban terus membesar, dan
pengguna dapat melihat campuran dua versi.

**Perbaikan:** penomoran versi pada nama cache, dan penghapusan seluruh cache
milik aplikasi yang bukan versi berjalan.

```js
const VERSI = 'v2';
const MILIK_KAMI = /^elmozza-(shell|lessons|audio)-/;
// saat activate: hapus semua yang cocok MILIK_KAMI tetapi bukan versi berjalan
```

### 2.3 Data bisa basi

Semua permintaan GET diperlakukan sama — cache dulu, jaringan belakangan.
Papan peringkat dan kuis dapat menampilkan angka lama.

**Perbaikan:** `/api/*` memakai jaringan lebih dulu, cache hanya bila gagal.
Hanya `/api/content/*` yang disimpan, karena isinya memang tetap.

### 2.4 `addAll` gagal seluruhnya bila satu berkas hilang

`cache.addAll()` membatalkan seluruh pemasangan bila satu alamat saja gagal.

**Perbaikan:** dipasang satu per satu, kegagalan satu berkas tidak membatalkan
yang lain.

### 2.5 `navigator.onLine` tidak dapat dipercaya

Pada pengujian tanpa jaringan, halaman tetap menulis *"You are back online"* —
karena `navigator.onLine` bernilai benar selama masih ada sambungan Wi-Fi,
walau Wi-Fi itu sendiri tidak punya internet. Ini juga terjadi pada perangkat
sungguhan.

**Perbaikan:** keadaan sambungan disimpulkan dari percobaan mengambil berkas
kecil dengan batas waktu 4 detik, bukan dari nilai `onLine` semata. Diperiksa
ulang tiap 5 detik supaya tampilan berubah sendiri saat sambungan pulih.

---

## 3. Web Push tetap utuh

`static/sw.js` menangani `push` dan `notificationclick` yang sudah berjalan di
produksi. Memindahkannya ke `src/service-worker.ts` bawaan SvelteKit akan
mengubah alamat berkas service worker, dan itu **memutus langganan push yang
sudah terdaftar** di peramban pengguna.

Karena itu berkas dipertahankan di `static/`. Keputusan ini sadar, bukan
kelalaian — penomoran versi build otomatis dikorbankan demi tidak merusak
pemberitahuan yang sudah jalan.

Terverifikasi: jumlah penangan `push` dan `notificationclick` sama sebelum dan
sesudah perubahan.

---

## 4. Halaman luring

`src/routes/offline/+page.svelte` — dibuat mengikuti warna dan nada aplikasi
(`#FBFAF7`, huruf tenang), bukan tampilan galat.

Tiga keadaan:

```
memeriksa    "Checking connection"   titik berdenyut
tanpa sinyal "No connection"          titik kelabu
sambungan ada "You are back online"   titik hijau
```

Kalimat penutup *"Downloaded lessons work without internet"* sengaja
dicantumkan — menyiapkan pengguna untuk Phase 3.

Gerakan dimatikan bila perangkat meminta pengurangan gerak
(`prefers-reduced-motion`).

---

## 5. Hasil pengujian

Peramban sungguhan (Chromium melalui Playwright), bukan hanya alat pengembang.
Dibangun dengan `npm run build`, disajikan dengan `vite preview`.

### Sebelum jaringan diputus

```
service worker         aktif
cache terbentuk        elmozza-shell-v2
isi kerangka           /offline, /manifest.webmanifest, /icons/icon-192.png
```

### Setelah jaringan diputus

| Uji | Hasil |
|---|---|
| Muat ulang `/offline` | **No connection** ✓ |
| Buka halaman yang belum pernah dibuka | **No connection** ✓ |
| Buka `/login` yang tidak ada di cache | **No connection** ✓ |

```
LULUS 3/3
```

Ketiganya menyajikan halaman luring, bukan galat peramban. Bandingkan dengan
percobaan sebelum perbaikan: `net::ERR_FAILED`.

### Setelah jaringan dipulihkan

```
teks berubah sendiri:  You are back online
tombol berubah:        Continue learning
```

Tanpa pengguna menekan apa pun.

### Pemeriksaan lain

```
node --check static/sw.js     SINTAKS OK
npm run build                  ✔ done (adapter-cloudflare)
```

---

## 6. Yang BELUM diuji

**Perangkat sungguhan.** Pengujian dilakukan di Chromium pada laptop. Blueprint
meminta pengujian di HP asli: pasang → tutup peramban → buka dari ikon → mode
pesawat.

Yang belum terbukti:
- pemasangan ke layar utama Android
- perilaku di iOS Safari (paling sering bermasalah)
- tampilan `apple-touch-icon` yang baru ditambahkan

**Sebab:** aplikasi belum diterapkan ke alamat sungguhan. Service worker
memerlukan HTTPS, dan penerapan memerlukan akses Cloudflare yang tokennya
ditolak.

---

## 7. Penghalang yang masih ada

```
Token Cloudflare ditolak    Authentication error [code: 10000]
```

Akibatnya Phase 1 **belum dapat diterapkan** ke `english.elmozza.com`, dan
pengujian di HP belum dapat dilakukan.

Perubahan ini aman disimpan ke repo dan diterapkan kapan saja token diperbarui.

---

## 8. Usulan pesan commit

```
feat(pwa): phase-1 — perbaiki service worker, tambah halaman luring

- sw.js: penomoran versi + pembersihan cache lama
- sw.js: jangan simpan pengalihan (memutus pemakaian luring)
- sw.js: /api/* jaringan dulu, media cache dulu
- tambah /offline dengan pemeriksaan sambungan sungguhan
- tambah apple-touch-icon dan meta iOS
- Web Push tidak diubah
```

**Belum di-commit.** Menunggu persetujuan.

---

## 9. Yang perlu diputuskan sebelum Phase 2

1. **Apakah perubahan ini di-commit sekarang**, atau menunggu bisa diuji di HP?

2. **Audio Phase 2** — R2 belum ada dan token ditolak. Pilihan: taruh audio 10
   dialog di `static/` (sekitar 2,5 MB) supaya Phase 2 dapat berjalan tanpa
   akses Cloudflare, atau tunggu R2.

3. **Rute `/learn`** — sudah ada dan berfungsi dengan isi lain. Dipakai ulang
   untuk dialog, atau buat rute baru?

4. **Pemetaan tingkat** — koleksi memakai 1/2/3, blueprint memakai A1/A2/B1.

---

**⛔ PHASE 1 SELESAI. Menunggu persetujuan sebelum Phase 2.**
