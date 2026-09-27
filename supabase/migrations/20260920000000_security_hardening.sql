-- Security hardening
--
-- This migration preserves the intended workflow:
-- * the first bootstrap user may become admin;
-- * public registrations become inactive interns;
-- * accounts created by the protected create-user Edge Function can later
--   receive the role selected by an existing admin.
--
-- The important security rule is that a public signup must never be able to
-- choose its own role through auth metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  is_first boolean;
  chosen public.app_role;
BEGIN
  -- Prevent two concurrent signups from both becoming the first admin.
  PERFORM pg_advisory_xact_lock(918273645::bigint);

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles)
    INTO is_first;

  -- Every non-bootstrap signup must be allowlisted. The protected
  -- create-user Edge Function adds admin-created emails before calling
  -- auth.admin.createUser.
  IF NOT is_first
     AND NOT EXISTS (
       SELECT 1
       FROM public.registration_allowlist
       WHERE lower(email) = lower(trim(NEW.email))
     )
  THEN
    RAISE EXCEPTION 'Email belum diizinkan untuk pendaftaran';
  END IF;

  -- Never trust NEW.raw_user_meta_data->>'role' here. That metadata is
  -- supplied by the caller and can be forged outside the website UI.
  IF is_first THEN
    chosen := 'admin';
  ELSE
    chosen := 'magang';
  END IF;

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
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'nik_nim',
    NEW.raw_user_meta_data->>'no_hp',
    NEW.raw_user_meta_data->>'jabatan',
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data->>'divisi_id', '') ~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (NEW.raw_user_meta_data->>'divisi_id')::uuid
      ELSE NULL
    END,
    is_first
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, chosen)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.is_aktif(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_aktif(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_status_aktif()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status_aktif FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.current_status_aktif() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_status_aktif() TO authenticated, service_role;

-- A logged-in user may see their own profile. Admins and active supervisors
-- may see the user directory used by the application.
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.is_aktif(auth.uid())
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'supervisor')
      )
    )
  );

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_aktif(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Users may edit their own profile fields, but cannot activate themselves.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND status_aktif = public.current_status_aktif()
  );

DROP POLICY IF EXISTS divisi_admin_write ON public.divisi;
CREATE POLICY divisi_admin_write ON public.divisi
  FOR ALL TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_aktif(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS roles_read_own_or_admin ON public.user_roles;
CREATE POLICY roles_read_own_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.is_aktif(auth.uid())
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'supervisor')
      )
    )
  );

DROP POLICY IF EXISTS reports_select ON public.daily_reports;
CREATE POLICY reports_select ON public.daily_reports
  FOR SELECT TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR (
        public.has_role(auth.uid(), 'supervisor')
        AND divisi_id = public.my_divisi()
      )
    )
  );

DROP POLICY IF EXISTS reports_validator_update ON public.daily_reports;
CREATE POLICY reports_validator_update ON public.daily_reports
  FOR UPDATE TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        public.has_role(auth.uid(), 'supervisor')
        AND divisi_id = public.my_divisi()
      )
    )
  )
  WITH CHECK (
    public.is_aktif(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        public.has_role(auth.uid(), 'supervisor')
        AND divisi_id = public.my_divisi()
      )
    )
  );

DROP POLICY IF EXISTS reports_admin_delete ON public.daily_reports;
CREATE POLICY reports_admin_delete ON public.daily_reports
  FOR DELETE TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS reports_delete_own ON public.daily_reports;
CREATE POLICY reports_delete_own ON public.daily_reports
  FOR DELETE TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND user_id = auth.uid()
    AND status_validasi = 'menunggu'
  );

DROP POLICY IF EXISTS photos_select ON public.report_photos;
CREATE POLICY photos_select ON public.report_photos
  FOR SELECT TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.daily_reports AS r
      WHERE r.id = report_id
        AND (
          r.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR (
            public.has_role(auth.uid(), 'supervisor')
            AND r.divisi_id = public.my_divisi()
          )
        )
    )
  );

DROP POLICY IF EXISTS photos_write_own ON public.report_photos;
CREATE POLICY photos_write_own ON public.report_photos
  FOR ALL TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.daily_reports AS r
      WHERE r.id = report_id
        AND (
          r.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  )
  WITH CHECK (
    public.is_aktif(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.daily_reports AS r
      WHERE r.id = report_id
        AND (
          r.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS validasi_select ON public.validasi_reports;
CREATE POLICY validasi_select ON public.validasi_reports
  FOR SELECT TO authenticated
  USING (
    public.is_aktif(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'supervisor')
    )
  );

DROP POLICY IF EXISTS validasi_insert ON public.validasi_reports;
CREATE POLICY validasi_insert ON public.validasi_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    supervisor_id = auth.uid()
    AND public.is_aktif(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        public.has_role(auth.uid(), 'supervisor')
        AND EXISTS (
          SELECT 1
          FROM public.daily_reports AS r
          WHERE r.id = report_id
            AND r.divisi_id = public.my_divisi()
        )
      )
    )
  );

-- Storage access must follow report access, not merely "is logged in".
DROP POLICY IF EXISTS report_photos_read ON storage.objects;
CREATE POLICY report_photos_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND public.is_aktif(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.report_photos AS p
      JOIN public.daily_reports AS r ON r.id = p.report_id
      WHERE p.photo_path = name
        AND (
          r.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR (
            public.has_role(auth.uid(), 'supervisor')
            AND r.divisi_id = public.my_divisi()
          )
        )
    )
  );

DROP POLICY IF EXISTS report_photos_insert ON storage.objects;
CREATE POLICY report_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-photos'
    AND public.is_aktif(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS report_photos_delete ON storage.objects;
CREATE POLICY report_photos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND public.is_aktif(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
