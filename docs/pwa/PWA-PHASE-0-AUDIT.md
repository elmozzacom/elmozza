# PWA PHASE 0 — AUDIT

**Tanggal:** 18 September 2026
**Repo:** `/home/yogik/client-workspaces/pak-dokter/projects/elmozza`
**Sifat:** read-only. Tidak ada berkas yang diubah, tidak ada perintah `--remote`.

---

## TEMUAN UTAMA

> **PWA sudah ada dan terpasang.** Phase 1 blueprint sebagian besar sudah selesai
> sebelum dokumen langkah teknis ini ditulis. Yang benar-benar hilang bukan PWA,
> melainkan **R2 untuk audio** dan **tabel konten dialog di D1**.

Ini mengubah urutan kerja: Phase 1 tinggal penyempurnaan kecil, bukan pembangunan
dari nol. Tenaga sebaiknya dialihkan ke Phase 2 dan 3.

---

## 1. Identitas repo

```
nama paket        elmozza.com
git remote        github.com/elmozzacom/elmozza.git
cabang            main (sinkron dengan origin)
commit terakhir   e9e402c feat(quiz): unify Hermes Telegram polls and web sessions
```

Terkonfirmasi sebagai repo yang dimaksud dokumen langkah teknis.

---

## 2. Tumpukan teknologi

```
@sveltejs/kit              ^2.49.1
svelte                     ^5.45.6
@sveltejs/adapter-cloudflare ^7.2.4     ← Pages, bukan Workers
tailwindcss                ^4.3.3
drizzle-orm                ^0.45.2
wrangler                   ^4.57.0
```

Sesuai asumsi dokumen. Adapter yang dipakai `adapter-cloudflare` — berarti
Cloudflare **Pages**, dan `src/service-worker.ts` bawaan SvelteKit tersedia bila
nanti diperlukan.

---

## 3. Kesiapan PWA — sebagian besar SUDAH ADA

| Butir | Status | Keterangan |
|---|---|---|
| `static/manifest.webmanifest` | **ADA** | nama, start_url `/learn`, display standalone, theme color |
| Ikon 192 / 512 / maskable | **ADA** | ketiganya lengkap di `static/icons/` |
| `<link rel="manifest">` | **ADA** | di `src/routes/+layout.svelte` baris 37 |
| `<meta name="theme-color">` | **ADA** | baris 38 |
| Service worker | **ADA** | `static/sw.js` — bukan `src/service-worker.ts` |
| Pendaftaran SW | **ADA** | `src/lib/components/PwaBoot.svelte` |
| Halaman offline | **TIDAK ADA** | belum ada `/offline` |
| `apple-touch-icon` | **TIDAK ADA** | ikon iOS belum dipasang |

### Isi service worker yang ada

```js
SHELL = ['/', '/learn', '/manifest.webmanifest', '/icons/icon-192.png']
cache 'elmozza-shell-v1'    cache-first untuk shell
cache 'elmozza-lessons-v1'  simpan /learn dan /_app/ saat diakses
```

Strateginya sederhana tapi benar. Kekurangannya:

1. **Tanpa penomoran versi build.** `SHELL` ditulis tangan, tidak memakai
   `$service-worker` (`build`, `files`, `version`). Setelah deploy baru,
   berkas `/_app/` lama tetap tersimpan — pengguna bisa melihat campuran versi.
2. **Cache tidak pernah dibersihkan.** Tidak ada penghapusan cache lama saat
   `activate`. Lama-lama ruang penyimpanan penuh.
3. **Tidak ada penanganan `/api/*`.** Semua GET satu origin diperlakukan sama,
   termasuk data yang seharusnya selalu baru.

---

## 4. Cloudflare — TIDAK DAPAT DIPERIKSA

```
npx wrangler whoami     ✘ authentication may have expired
npx wrangler d1 list    ✘ Authentication error [code: 10000]
```

Token `CLOUDFLARE_API_TOKEN` ada di lingkungan tetapi **ditolak Cloudflare**.
Kewenangannya tidak cukup, atau sudah dicabut.

**Akibatnya, yang berikut ini BELUM TERVERIFIKASI:**

- daftar D1 yang benar-benar ada di akun
- apakah `elmozza-db` masih hidup dan isinya apa
- daftar bucket R2
- daftar proyek Pages
- skema D1 di sisi remote

Seluruh temuan D1 dan R2 di bawah berasal dari **membaca berkas repo**, bukan
dari akun Cloudflare. Perlu diverifikasi ulang setelah token diperbarui.

---

## 5. D1 menurut berkas repo

```toml
binding        = "DB"
database_name  = "elmozza-db"
database_id    = "75491b81-a886-41cf-80e7-66156befcd4e"
```

### Tabel yang ada di `src/lib/server/schema.ts`

```
registrations
questionnaires
questionnaire_responses
mercy_unlocks
audit_logs
```

### Yang dibutuhkan blueprint tetapi BELUM ADA

```
dialogs
dialog_assets
content_packages
user_progress
```

**Tidak ada satu pun tabel konten dialog.** Semua tabel yang ada berkaitan dengan
pendaftaran, kuesioner, dan catatan — bukan materi ajar.

### Tidak ada folder migrasi

`drizzle/` tidak ada. Perubahan skema selama ini kemungkinan dijalankan manual.
Untuk Phase 2 perlu dibuat alur migrasi yang tercatat, supaya perubahan bisa
diulang dan ditelusuri.

---

## 6. R2 — BELUM ADA SAMA SEKALI

`wrangler.toml` **tidak memuat `[[r2_buckets]]`**. Tidak ada bucket terikat.

Ini penghalang nyata untuk Phase 2 dan 3, karena audio tidak bisa disimpan di D1.

Pilihan yang tersedia:

| Pilihan | Untung | Rugi |
|---|---|---|
| Buat bucket baru `elmozza-media` | bersih, khusus | perlu akses Cloudflare |
| Pakai bucket yang sudah ada | tanpa buat baru | belum diketahui ada apa tidak |
| Taruh audio di `static/` | tanpa R2 sama sekali | membengkakkan repo & deploy |

Untuk 10 dialog Phase 2 (sekitar 2,5 MB), pilihan ketiga sebenarnya **masuk akal
sebagai langkah sementara** — tidak perlu menunggu akses Cloudflare. Tetapi untuk
281 dialog (68 MB audio) R2 wajib.

---

## 7. Bahan dialog — SUDAH SIAP, di luar repo

Terpisah dari repo `elmozza`, di `English El Mozza/Conversation Warehouse/produk/`:

```
data-lengkap.json    281 dialog, 1,24 MB
                     tiap dialog: 10 baris (en + id), 5 soal, 4 pilihan
audio/               2.810 berkas mp3, 68 MB
                     satu berkas per baris, empat suara
video/               281 berkas mp4, 0,31 GB
                     tegak 1080×1920
```

### Kesesuaian dengan skema blueprint §6

| Medan blueprint | Ada? | Catatan |
|---|---|---|
| `id` | ya | medan `kode`, mis. `NEW-SAN-001` |
| `title` | ya | `judul` |
| `level` | ya | angka 1–3, blueprint memakai A1/A2/B1 — perlu pemetaan |
| `topic` | ya | `tags`, mis. umum / medis / hukum |
| `lines[]` | ya | `baris[]` dengan `en`, `id`, `peran`, `audio` |
| `exercises[]` | ya | `soal[]` dengan 4 pilihan + jawaban + penjelasan |
| `version` | **tidak** | perlu ditambahkan |
| `audio_url` | sebagian | ada jalur berkas lokal, belum URL R2 |

Bahannya matang. Yang perlu hanya **pengubahan bentuk**, bukan pembuatan ulang.

---

## 8. Rute yang sudah ada

```
routes/
  learn/          +page.server.ts, +page.svelte, step/
  quiz/  practice/  lesson/  daily-coach/
  dashboard/  leaderboard/  profile/
  admin/  login/  register/  onboarding/
  api/    board/  push/  quiz/  telegram/
```

Sudah ada `/learn` dan `/practice`. **Belum ada** `api/content/*` maupun
`api/media/*` yang dibutuhkan blueprint.

Perlu diperiksa di Phase 1: apakah `/learn` yang ada sekarang akan dipakai ulang
atau diganti. Mengganti berarti membongkar yang sudah jalan.

---

## 9. Rencana perubahan minimal untuk Phase 1

Karena PWA sudah ada, Phase 1 **tinggal tiga hal kecil**:

| Berkas | Tindakan | Alasan |
|---|---|---|
| `static/sw.js` | perbaiki | tambah pembersihan cache lama saat `activate` |
| `src/routes/offline/+page.svelte` | buat | halaman cadangan saat tidak ada jaringan |
| `src/routes/+layout.svelte` | tambah 1 baris | `apple-touch-icon` untuk iOS |

**Tidak perlu** memasang `vite-plugin-pwa` atau Workbox. Yang ada sudah bekerja.

Pertanyaan yang perlu diputuskan: apakah `static/sw.js` dipertahankan, atau
dipindah ke `src/service-worker.ts` bawaan SvelteKit supaya dapat penomoran versi
build secara otomatis. Pemindahan lebih benar secara teknis, tetapi mengubah
berkas yang sudah berjalan di produksi.

---

## 10. Penghalang yang harus diselesaikan lebih dulu

| Penghalang | Akibat | Yang dibutuhkan |
|---|---|---|
| **Token Cloudflare ditolak** | tidak bisa periksa D1/R2, tidak bisa deploy | token baru dengan kewenangan Workers + D1 + R2 |
| **R2 belum ada** | audio tidak punya tempat | buat bucket, atau pakai `static/` untuk 10 dialog |
| **Tabel konten belum ada** | dialog tidak bisa disimpan | migrasi tambahan, setelah cadangan |

Penghalang pertama menghambat dua lainnya.

---

## 11. Yang bisa dikerjakan TANPA akses Cloudflare

Supaya pekerjaan tidak berhenti menunggu token:

```
Phase 1 penuh          sw.js, halaman offline, apple-touch-icon
Pengubahan bentuk      281 dialog → bentuk JSON blueprint
10 dialog Phase 2      isi + audio, diuji dengan `wrangler dev --local`
Lapisan IndexedDB      src/lib/db/idb.ts, diuji di peramban
Pengunduh paket        src/lib/offline/download.ts
```

Hanya penyimpanan ke D1 remote, unggah R2, dan deploy yang benar-benar
memerlukan akses.

---

## 12. Pertanyaan yang perlu keputusan

1. **Service worker** — pertahankan `static/sw.js`, atau pindah ke
   `src/service-worker.ts` bawaan SvelteKit? Pemindahan memberi penomoran versi
   otomatis, tetapi mengubah yang sudah berjalan.

2. **Rute `/learn`** — sudah ada dan berfungsi. Dipakai ulang untuk konten
   dialog, atau buat rute baru supaya yang lama tidak terganggu?

3. **Audio Phase 2** — tunggu R2, atau taruh 10 dialog di `static/` dulu supaya
   bisa jalan tanpa akses Cloudflare?

4. **Pemetaan level** — koleksi memakai angka 1/2/3, blueprint memakai A1/A2/B1.
   Pemetaan mana yang dipakai?

5. **Bucket R2** — buat `elmozza-media` baru, atau pakai yang sudah ada di akun?
   Belum bisa diperiksa tanpa token.

---

## 13. Ringkasan

**Yang sudah baik:**
PWA terpasang dan berjalan. Tumpukan teknologi sesuai. Bahan dialog lengkap dan
matang — 281 dialog dengan audio, soal, dan video.

**Yang menghambat:**
Token Cloudflare ditolak. R2 belum ada. Tabel konten belum ada.

**Saran urutan:**
Kerjakan Phase 1 sekarang — kecil dan tanpa penghalang. Sambil itu ubah bentuk
data dan siapkan 10 dialog Phase 2 secara lokal. Begitu token diperbarui,
pekerjaan yang tertunda tinggal dijalankan, bukan dimulai.

---

**⛔ PHASE 0 SELESAI. Menunggu keputusan sebelum Phase 1.**
