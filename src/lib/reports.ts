import { supabase } from "@/integrations/supabase/client";
import type { StatusKerja, StatusValidasi } from "./constants";

export type ReportRow = {
  id: string;
  user_id: string;
  divisi_id: string | null;
  tanggal: string;
  jabatan: string | null;
  pekerjaan_kemarin: string;
  kendala: string | null;
  solusi: string | null;
  progress: number;
  rencana_hari_ini: string;
  durasi_jam: number;
  status_pekerjaan: StatusKerja;
  status_validasi: StatusValidasi;
  catatan: string | null;
  catatan_revisi: string | null;
  created_at: string;
  nama: string;
  divisi_nama: string;
  photos: { id: string; photo_path: string }[];
};

export type ReportFilters = {
  nama?: string;
  divisiId?: string;
  tanggal?: string;
  bulan?: string;
  tahun?: string;
  status?: StatusValidasi | "";
  userId?: string;
};

export async function fetchReports(filters: ReportFilters = {}): Promise<ReportRow[]> {
  let q = supabase
    .from("daily_reports")
    .select("*, divisi:divisi_id(nama_divisi), report_photos(id, photo_path)")
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.divisiId) q = q.eq("divisi_id", filters.divisiId);
  if (filters.userId) q = q.eq("user_id", filters.userId);
  if (filters.status) q = q.eq("status_validasi", filters.status);
  if (filters.tanggal) q = q.eq("tanggal", filters.tanggal);
  if (!filters.tanggal && (filters.bulan || filters.tahun)) {
    const year = filters.tahun ? Number(filters.tahun) : new Date().getFullYear();
    if (filters.bulan) {
      const m = Number(filters.bulan);
      const start = `${year}-${String(m).padStart(2, "0")}-01`;
      const endDate = new Date(year, m, 0).getDate();
      const end = `${year}-${String(m).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
      q = q.gte("tanggal", start).lte("tanggal", end);
    } else {
      q = q.gte("tanggal", `${year}-01-01`).lte("tanggal", `${year}-12-31`);
    }
  }

  const { data, error } = await q.limit(1000);
  if (error) throw error;
  const rows = data ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const nameMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nama")
      .in("id", userIds);
    for (const p of profs ?? []) nameMap.set(p.id, p.nama);
  }

  const mapped: ReportRow[] = rows.map((r) => ({
    ...r,
    progress: Number(r.progress),
    durasi_jam: Number(r.durasi_jam),
    status_pekerjaan: r.status_pekerjaan as StatusKerja,
    status_validasi: r.status_validasi as StatusValidasi,
    nama: nameMap.get(r.user_id) ?? "Pengguna",
    divisi_nama: (r.divisi as { nama_divisi: string } | null)?.nama_divisi ?? "-",
    photos: (r.report_photos ?? []) as { id: string; photo_path: string }[],
  }));

  if (filters.nama) {
    const needle = filters.nama.toLowerCase();
    return mapped.filter((r) => r.nama.toLowerCase().includes(needle));
  }
  return mapped;
}

export async function fetchDivisi() {
  const { data, error } = await supabase
    .from("divisi")
    .select("id, nama_divisi, deskripsi, created_at")
    .order("nama_divisi");
  if (error) throw error;
  return data ?? [];
}

export async function fetchReport(id: string): Promise<ReportRow | null> {
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*, divisi:divisi_id(nama_divisi), report_photos(id, photo_path)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: prof } = await supabase
    .from("profiles")
    .select("nama")
    .eq("id", data.user_id)
    .maybeSingle();

  return {
    ...data,
    progress: Number(data.progress),
    durasi_jam: Number(data.durasi_jam),
    status_pekerjaan: data.status_pekerjaan as StatusKerja,
    status_validasi: data.status_validasi as StatusValidasi,
    nama: prof?.nama ?? "Pengguna",
    divisi_nama: (data.divisi as { nama_divisi: string } | null)?.nama_divisi ?? "-",
    photos: (data.report_photos ?? []) as { id: string; photo_path: string }[],
  };
}

export async function submitValidasi(args: {
  reportId: string;
  supervisorId: string;
  status: StatusValidasi;
  catatan?: string;
}) {
  const { error } = await supabase
    .from("daily_reports")
    .update({ status_validasi: args.status, catatan_revisi: args.catatan || null })
    .eq("id", args.reportId);
  if (error) throw error;
  const { error: logErr } = await supabase.from("validasi_reports").insert({
    report_id: args.reportId,
    supervisor_id: args.supervisorId,
    status: args.status,
    catatan: args.catatan || null,
  });
  if (logErr) throw logErr;
}
