# Panduan Menjalankan & Hosting Sendiri (Gratis)

Aplikasi: Merapi Tani Daily Report System
Teknologi: React + TanStack Start + Vite, database & login memakai Supabase.

---

## 1. Buka di VS Code

1. Ekstrak file zip ini.
2. Buka foldernya di VS Code.
3. Pastikan Node.js versi 20 atau lebih baru sudah terpasang (https://nodejs.org).
4. Di terminal VS Code jalankan:

```bash
npm install
```

5. Buat file baru bernama `.env` di folder utama, isinya:

```
VITE_SUPABASE_URL="https://<id-proyek>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<kunci publishable>"
VITE_SUPABASE_PROJECT_ID="<id-proyek>"
SUPABASE_URL="https://<id-proyek>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<kunci publishable>"
SUPABASE_PROJECT_ID="<id-proyek>"
```

6. Jalankan:

```bash
npm run dev
```

Buka http://localhost:8080

---

## 2. Menyiapkan Database Sendiri (gratis)

Buat akun gratis di https://supabase.com, lalu buat satu proyek baru
(paket Free: cukup untuk aplikasi internal seperti ini).

Setelah proyek jadi:

1. Ambil `Project URL` dan `publishable/anon key` dari menu **Project Settings → API**,
   masukkan ke `.env` seperti contoh di atas.
2. Buka menu **SQL Editor** dan jalankan isi file di folder `supabase/migrations/`
   satu per satu, dari nama file paling lama ke paling baru. Ini membuat semua tabel
   (divisi, profiles, user_roles, daily_reports, report_photos, validasi_reports),
   aturan hak akses, dan fungsi pendukungnya.
3. Buka menu **Storage**, buat bucket baru bernama `report-photos`, biarkan
   **private**, batas ukuran file 5 MB. Bucket ini menyimpan foto bukti pekerjaan.
4. Buka **Authentication → Providers → Email**, aktifkan, dan nyalakan
   "Confirm email" sesuai selera. Di aplikasi ini akun baru tetap harus
   disetujui Admin, jadi konfirmasi email boleh dimatikan.
5. Orang pertama yang mendaftar otomatis menjadi Admin.

---

## 3. Pilihan Hosting Gratis

Aplikasi ini punya bagian server (SSR), jadi pilih layanan yang mendukungnya.
Ketiga pilihan di bawah punya paket gratis.

### Pilihan A — Cloudflare Workers (paling cocok, proyek ini sudah disiapkan untuk Cloudflare)

1. Buat akun gratis di https://dash.cloudflare.com
2. Di terminal:

```bash
npm run build
npx wrangler login
npx wrangler deploy
```

3. Masukkan variabel lingkungan (isi `.env` di atas) lewat
   **Workers & Pages → proyek Anda → Settings → Variables**.
4. Website akan tersedia di alamat `nama-proyek.workers.dev`.

### Pilihan B — Netlify

1. Unggah kode ke GitHub (repository boleh private).
2. Masuk ke https://netlify.com → **Add new site → Import from GitHub**.
3. Build command: `npm run build`
4. Tambahkan variabel lingkungan di **Site settings → Environment variables**.

### Pilihan C — Vercel

1. Unggah kode ke GitHub.
2. Masuk ke https://vercel.com → **New Project** → pilih repository.
3. Vercel mendeteksi Vite otomatis; tambahkan variabel lingkungan yang sama.
4. Paket Hobby gratis untuk penggunaan non-komersial.

---

## 4. Domain

Ketiga layanan di atas memberi alamat gratis (`*.workers.dev`, `*.netlify.app`,
`*.vercel.app`). Kalau ingin domain sendiri seperti `laporan.merapitani.com`,
domainnya perlu dibeli terpisah lalu diarahkan lewat menu Domain di layanan hosting.

---

## 5. Catatan Penting

- Jangan pernah menaruh kunci `service_role` Supabase di kode yang dikirim ke browser
  atau di repository publik. Kunci itu hanya untuk sisi server.
- Backup: Supabase Free menyimpan data selama proyek aktif; ekspor berkala lewat
  menu Database → Backups atau fitur ekspor di aplikasi.
- Perintah penting:
  - `npm run dev` — jalankan lokal
  - `npm run build` — buat versi produksi
