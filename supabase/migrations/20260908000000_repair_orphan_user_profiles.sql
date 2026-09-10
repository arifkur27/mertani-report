-- Perbaiki akun Auth yang sudah ada tetapi belum memiliki baris profiles
-- dan/atau user_roles. Aman dijalankan berulang kali karena memakai upsert.

INSERT INTO public.profiles (
  id,
  nama,
  email,
  nik_nim,
  no_hp,
  jabatan,
  divisi_id,
  status_aktif
)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'nama', ''), split_part(u.email, '@', 1)),
  u.email,
  NULLIF(u.raw_user_meta_data->>'nik_nim', ''),
  NULLIF(u.raw_user_meta_data->>'no_hp', ''),
  NULLIF(u.raw_user_meta_data->>'jabatan', ''),
  CASE
    WHEN NULLIF(u.raw_user_meta_data->>'divisi_id', '') ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN (u.raw_user_meta_data->>'divisi_id')::uuid
    ELSE NULL
  END,
  false
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS p WHERE p.id = u.id
);

INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  CASE
    WHEN u.raw_user_meta_data->>'role' IN ('admin', 'supervisor', 'karyawan', 'magang')
      THEN (u.raw_user_meta_data->>'role')::public.app_role
    ELSE 'magang'::public.app_role
  END
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles AS r WHERE r.user_id = u.id
);