-- Galeri untuk karyawan dan magang hanya boleh membaca foto milik sendiri.
-- Admin tetap dapat melihat seluruh laporan, sedangkan supervisor tetap dapat
-- melihat laporan pada divisinya untuk kebutuhan validasi.

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

-- Rebuild storage access as well. This prevents a user from opening or
-- downloading another user's photo by guessing its storage path.
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
