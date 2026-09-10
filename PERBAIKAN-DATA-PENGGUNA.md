# Perbaikan penyimpanan Data Pengguna

Perubahan utama:

- `supabase/functions/create-user/index.ts` sekarang menyimpan `profiles` dan
  `user_roles` secara eksplisit setelah akun Auth berhasil dibuat.
- Jika penyimpanan profil atau role gagal, akun Auth yang baru dibuat dibersihkan
  agar tidak meninggalkan data setengah jadi.
- `supabase/migrations/20260908000000_repair_orphan_user_profiles.sql`
  memperbaiki akun lama yang sudah ada di Auth tetapi belum memiliki data
  `profiles` atau `user_roles`.
- Halaman Data Pengguna sekarang menampilkan pesan error dari Edge Function,
  bukan hanya pesan umum.

## Penerapan ke Supabase

Jalankan dari root project yang sudah terhubung ke project Supabase:

```bash
supabase db push
supabase functions deploy create-user
```

Pastikan Edge Function memiliki `SUPABASE_SERVICE_ROLE_KEY` sebagai secret
server-side. Jangan menaruh service role key di file `.env` frontend atau
mengirimkannya ke browser.

Setelah deploy, login sebagai admin lalu coba tambah satu pengguna baru dari
menu **Data Pengguna**. Data harus muncul pada tabel `profiles` dan
`user_roles`.