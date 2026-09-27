# Perbaikan keamanan

ZIP ini mempertahankan alur penggunaan aplikasi:

- Admin tetap dapat membuat akun karyawan, supervisor, magang, atau admin
  melalui menu Data Pengguna.
- Anak magang tetap dapat mendaftar setelah emailnya dimasukkan Admin ke
  allowlist.
- User biasa tetap tidak mendapat akses ke menu administrasi.

## Yang berubah

1. Pendaftaran publik tidak lagi dapat menentukan role melalui metadata
   request. Selain akun bootstrap pertama, pendaftaran baru selalu mendapat
   role `magang` dan `status_aktif = false`.
2. Pendaftaran baru harus memakai email yang ada di
   `registration_allowlist`. Pemeriksaan ini dilakukan oleh trigger database,
   bukan hanya oleh frontend.
3. Edge Function `create-user` menambahkan email akun yang dibuat Admin ke
   allowlist sebelum membuat user, lalu mengganti role bawaan `magang` dengan
   role yang dipilih Admin.
4. Akses profil, laporan, histori validasi, dan foto dibatasi oleh status aktif,
   role, kepemilikan laporan, serta divisi.
5. User biasa tidak dapat mengaktifkan dirinya sendiri melalui update profil.

## Penerapan migration

Jalankan seluruh file di `supabase/migrations/` sesuai urutan nama file.
Migration keamanan yang baru adalah:

```text
20260920000000_security_hardening.sql
20260927000000_gallery_personal_photo_access.sql
```

Migration galeri memastikan akun `karyawan` dan `magang` hanya dapat
membaca laporan serta foto milik sendiri. Admin tetap dapat melihat seluruh
data, sedangkan supervisor tetap dibatasi pada divisinya.

Deploy ulang Edge Function setelah source function berubah:

```bash
supabase functions deploy create-user
```

Sebelum menerapkan di production, lakukan backup database Supabase dan uji
minimal dengan akun Admin, Supervisor, Karyawan, dan Magang.

## Catatan bootstrap pertama

Untuk menjaga kompatibilitas dengan setup awal aplikasi, user pertama pada
database yang benar-benar kosong tetap menjadi Admin. Setelah Admin pertama
terbuat, semua user berikutnya wajib memakai email yang ada di allowlist.
