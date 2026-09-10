GRANT SELECT ON public.divisi TO anon;

DROP POLICY IF EXISTS divisi_read ON public.divisi;
CREATE POLICY divisi_read ON public.divisi
  FOR SELECT TO anon, authenticated
  USING (true);