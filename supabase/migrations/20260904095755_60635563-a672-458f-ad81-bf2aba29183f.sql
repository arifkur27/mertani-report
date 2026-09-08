CREATE TYPE public.app_role AS ENUM ('admin','supervisor','karyawan','magang');
CREATE TYPE public.status_kerja AS ENUM ('belum_mulai','sedang_berjalan','selesai','pending');
CREATE TYPE public.status_validasi AS ENUM ('menunggu','disetujui','ditolak','direvisi');

CREATE TABLE public.divisi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_divisi text NOT NULL UNIQUE,
  deskripsi text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.divisi TO authenticated;
GRANT ALL ON public.divisi TO service_role;
ALTER TABLE public.divisi ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nik_nim text,
  nama text NOT NULL DEFAULT '',
  email text,
  no_hp text,
  divisi_id uuid REFERENCES public.divisi(id) ON DELETE SET NULL,
  jabatan text,
  foto_profil text,
  tanggal_bergabung date NOT NULL DEFAULT current_date,
  status_aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.my_divisi()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT divisi_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  divisi_id uuid REFERENCES public.divisi(id) ON DELETE SET NULL,
  tanggal date NOT NULL DEFAULT current_date,
  jabatan text,
  pekerjaan_kemarin text NOT NULL DEFAULT '',
  kendala text,
  solusi text,
  progress integer NOT NULL DEFAULT 0,
  rencana_hari_ini text NOT NULL DEFAULT '',
  durasi_jam numeric(4,1) NOT NULL DEFAULT 0,
  status_pekerjaan public.status_kerja NOT NULL DEFAULT 'sedang_berjalan',
  catatan text,
  status_validasi public.status_validasi NOT NULL DEFAULT 'menunggu',
  catatan_revisi text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  photo_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_photos TO authenticated;
GRANT ALL ON public.report_photos TO service_role;
ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.validasi_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL,
  catatan text,
  status public.status_validasi NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.validasi_reports TO authenticated;
GRANT ALL ON public.validasi_reports TO service_role;
ALTER TABLE public.validasi_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "divisi_read" ON public.divisi FOR SELECT TO authenticated USING (true);
CREATE POLICY "divisi_admin_write" ON public.divisi FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles_read_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "reports_select" ON public.daily_reports FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'supervisor') AND divisi_id = public.my_divisi())
  );
CREATE POLICY "reports_insert_own" ON public.daily_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reports_update_own" ON public.daily_reports FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status_validasi <> 'disetujui') WITH CHECK (user_id = auth.uid());
CREATE POLICY "reports_delete_own" ON public.daily_reports FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status_validasi = 'menunggu');
CREATE POLICY "reports_validator_update" ON public.daily_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'supervisor') AND divisi_id = public.my_divisi()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'supervisor') AND divisi_id = public.my_divisi()));
CREATE POLICY "reports_admin_delete" ON public.daily_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "photos_select" ON public.report_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_reports r WHERE r.id = report_id));
CREATE POLICY "photos_write_own" ON public.report_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_reports r WHERE r.id = report_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.daily_reports r WHERE r.id = report_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "validasi_select" ON public.validasi_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "validasi_insert" ON public.validasi_reports FOR INSERT TO authenticated
  WITH CHECK (supervisor_id = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor')));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.profiles (id, nama, email, nik_nim, no_hp, jabatan, divisi_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'nik_nim',
    NEW.raw_user_meta_data->>'no_hp',
    NEW.raw_user_meta_data->>'jabatan',
    NULLIF(NEW.raw_user_meta_data->>'divisi_id','')::uuid
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.divisi (nama_divisi) VALUES
  ('IoT Development'),('Embedded System'),('Web Development'),('Mobile Development'),
  ('Network Engineering'),('Research and Development'),('Quality Assurance'),
  ('Human Resource'),('Finance'),('Marketing');