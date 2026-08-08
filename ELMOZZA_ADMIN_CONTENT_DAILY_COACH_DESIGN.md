# Elmozza — Rancangan Admin Konten & English Daily Coach 14 Hari

**Status:** Draft rancangan untuk review Pak Dokter — belum dipublikasikan  
**Repository:** `elmozzacom/elmozza`  
**Target awal:** Dewasa A1–A2; khususnya pengguna umum dan tenaga kesehatan  
**Prinsip:** konten mudah diedit, progress terlacak, review sebelum publikasi.

---

## 1. Sasaran pembaruan

1. Menjadikan Elmozza sebagai platform belajar yang lebih terstruktur, bukan hanya lima kuis statis per tema.
2. Menambahkan jalur **English Daily Coach — 14 Hari** tanpa menghapus tema yang telah ada.
3. Memisahkan **konten** dari **tampilan kode** sehingga lesson berikutnya dapat diedit dari panel admin.
4. Menyimpan progress pengguna secara aman dan transparan.
5. Menyediakan preview konten sebelum dipublikasikan.

## 2. Alur pengguna

```text
Landing page
  → pilih profesi
  → pilih jalur English Daily Coach
  → lihat daftar Day 1–14
  → buka lesson hari ini
  → dialog + terjemahan + kosakata + grammar
  → latihan + kuis
  → hasil/pembahasan
  → progress tersimpan
  → jadwal review H+1, H+3, H+7
```

### Status lesson pengguna

| Status | Arti |
|---|---|
| Belum mulai | User belum membuka lesson |
| Sedang belajar | Lesson dibuka, belum selesai |
| Selesai | Latihan/kuis selesai |
| Perlu review | Masuk jadwal H+1, H+3, atau H+7 |
| Diulang | User memilih mengulang lesson |

## 3. Tampilan pengguna yang diusulkan

### Halaman beranda

| Blok | Isi | Tujuan |
|---|---|---|
| Hero | “Belajar English sedikit demi sedikit, setiap hari.” | Menjelaskan manfaat secara sederhana |
| Pilih tujuan | English umum / kesehatan / bisnis / travel | Personalisasi awal |
| Jalur unggulan | English Daily Coach 14 Hari | Arahkan pengguna ke pilot utama |
| Progress ringkas | Day berjalan, poin, review berikutnya | Memotivasi tanpa membebani |
| Jalur lain | Grammar, Vocabulary, Pronunciation, Listening | Mempertahankan konten lama |

### Halaman lesson

| Urutan | Komponen | Contoh Day 1 |
|---:|---|---|
| 1 | Judul dan tujuan | Greeting and Introduction |
| 2 | Durasi dan level | 7 menit • A1–A2 |
| 3 | Dialog | Good morning. My name is Ahmad. |
| 4 | Terjemahan | Selamat pagi. Nama saya Ahmad. |
| 5 | Kosakata | good morning, name, fine |
| 6 | Pola bahasa | I am / You are |
| 7 | Latihan aktif | Ubah dialog memakai data diri |
| 8 | Kuis | Satu atau lebih pertanyaan |
| 9 | Pembahasan | Ditampilkan setelah jawaban |
| 10 | Review | H+1, H+3, H+7 |

### Halaman hasil

- Jumlah jawaban benar.
- Poin yang diperoleh.
- Pembahasan ringkas.
- Tombol ulangi.
- Tombol lanjut lesson berikutnya.
- Tombol tandai untuk review.

## 4. Panel admin konten

### Hak akses

| Peran | Hak akses |
|---|---|
| Owner/Admin | Membuat, mengubah, review, publish, arsipkan konten; melihat progress agregat |
| Editor | Membuat dan mengubah draft; tidak dapat publish |
| Reviewer | Memeriksa konten dan memberi catatan; tidak dapat mengubah publikasi tanpa izin |
| Learner | Hanya melihat lesson yang published dan progress miliknya |

### Menu panel admin

| Menu | Fungsi |
|---|---|
| Dashboard | Jumlah user, completion rate, lesson aktif, draft menunggu review |
| Tracks | Kelola jalur: Daily Coach, Grammar, Healthcare English, dll. |
| Lessons | Buat/edit Day 1–14 dan lesson berikutnya |
| Questions | Kelola kuis, opsi, jawaban, pembahasan |
| Review queue | Draft yang perlu ditinjau sebelum publish |
| Media | Audio, gambar, dan aset pembelajaran |
| Learner progress | Lihat agregat dan progress berdasarkan user berizin |
| Settings | Role, target poin, review interval, publikasi |

### Status konten

```text
Draft → In review → Approved → Published → Archived
```

Konten published tidak diubah diam-diam. Perubahan penting dibuat sebagai revisi baru agar riwayat tetap jelas.

## 5. Struktur data minimum

| Entitas | Field inti |
|---|---|
| `tracks` | id, slug, title, description, target_level, status |
| `lessons` | id, track_id, sequence, title, objective, duration_minutes, status, version |
| `lesson_sections` | id, lesson_id, type, content, sort_order |
| `questions` | id, lesson_id, type, prompt, explanation, status |
| `question_options` | id, question_id, text, is_correct, sort_order |
| `users` | id, display_name, role, created_at |
| `lesson_progress` | user_id, lesson_id, status, score, started_at, completed_at |
| `review_schedule` | user_id, lesson_id, due_at, review_type, completed_at |
| `content_revisions` | content_type, content_id, version, change_summary, editor_id, reviewed_by, published_at |

### Catatan keamanan

- Jawaban benar tidak dikirim ke browser sebelum user menjawab jika model kuis membutuhkan penilaian server-side.
- Password dan token tidak disimpan pada source code.
- Data user minimal; progress tidak memerlukan data identitas sensitif.
- Dashboard agregat adalah default; data per-user hanya untuk admin berizin.

## 6. Migrasi konten yang sudah tersedia

| Sumber lama | Target Elmozza |
|---|---|
| 14 file lesson Obsidian | 14 record `lessons` + section dialog/terjemahan/kosakata/grammar/latihan |
| 14 file bank soal | Record `questions` dan `question_options` |
| Tes diagnostik | Track/assessment terpisah sebelum Day 1 |
| Lima tema kuis hard-coded | Dipindahkan bertahap ke track dan lesson editable |

## 7. Tahap implementasi aman

| Tahap | Deliverable | Publish live? |
|---:|---|---|
| 1 | UI/UX mockup dan data schema | Tidak |
| 2 | Halaman Daily Coach dengan konten Day 1–14 sebagai data lokal | Tidak, preview saja |
| 3 | Database D1 + schema migration + progress | Tidak, test/staging |
| 4 | Admin login, role, editor lesson, workflow review | Tidak, staging |
| 5 | Import konten dan validasi editorial | Tidak, review Pak Dokter |
| 6 | Deployment preview dan uji pengguna terbatas | Hanya preview/staging |
| 7 | Publish production | Ya, setelah persetujuan eksplisit |

## 8. Kriteria penerimaan MVP Daily Coach

- [ ] User dapat memilih English Daily Coach.
- [ ] Day 1–14 muncul berurutan.
- [ ] Setiap Day memuat tujuan, dialog, terjemahan, kosakata, grammar, latihan, kuis, dan pembahasan.
- [ ] Pembahasan tampil setelah jawaban dikirim.
- [ ] Progress tersimpan per user.
- [ ] Review H+1/H+3/H+7 dapat dibuat.
- [ ] Konten dapat diedit admin tanpa mengubah kode aplikasi.
- [ ] Draft tidak otomatis terlihat publik.
- [ ] Tidak ada token/rahasia di repository.
- [ ] Ada test fungsi utama dan preview sebelum release.

## 9. Keputusan yang masih perlu Pak Dokter tentukan

1. Nama publik jalur: **English Daily Coach** atau **Elmozza Daily English**.
2. Apakah pilot pertama hanya untuk Pak Dokter atau 2–10 user undangan.
3. Metode login awal: kode undangan, Google login, atau Telegram login.
4. Apakah jalur **Kesehatan** diluncurkan bersamaan atau tahap kedua.
5. Apakah gaya tampilan utama: profesional minimalis, interaktif, atau gabungan.
6. Batas pengumpulan data/retensi progress yang disetujui.

## 10. Rekomendasi awal

Mulai dengan **English Daily Coach** bergaya profesional-interaktif:

- Tampilan bersih dan dewasa.
- Warna identitas Elmozza konsisten.
- Poin/progress secukupnya, tanpa nuansa permainan anak-anak.
- Konten umum lebih dahulu.
- Jalur Healthcare English dirilis setelah konten dan review cukup.

**Belum ada perubahan kode, commit, atau deployment dari dokumen ini.**
