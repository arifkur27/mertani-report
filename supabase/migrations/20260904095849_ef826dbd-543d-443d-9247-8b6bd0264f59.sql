CREATE POLICY "report_photos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-photos');
CREATE POLICY "report_photos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "report_photos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);