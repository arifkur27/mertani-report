CREATE OR REPLACE FUNCTION public.is_aktif(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT status_aktif FROM public.profiles WHERE id = _user_id), false)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first boolean;
  chosen public.app_role;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    chosen := 'admin';
  ELSE
    chosen := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'magang')::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, nama, email, nik_nim, no_hp, jabatan, divisi_id, status_aktif)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'nik_nim',
    NEW.raw_user_meta_data->>'no_hp',
    NEW.raw_user_meta_data->>'jabatan',
    NULLIF(NEW.raw_user_meta_data->>'divisi_id','')::uuid,
    is_first
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS reports_insert_own ON public.daily_reports;
CREATE POLICY reports_insert_own ON public.daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_aktif(auth.uid()));

DROP POLICY IF EXISTS reports_update_own ON public.daily_reports;
CREATE POLICY reports_update_own ON public.daily_reports
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status_validasi <> 'disetujui'::status_validasi AND public.is_aktif(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_aktif(auth.uid()));