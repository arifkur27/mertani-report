export const APP_NAME = "Merapi Tani Instrumen Daily Report System";
export const COMPANY = "PT Merapi Tani Instrumen";

export type AppRole = "admin" | "supervisor" | "karyawan" | "magang";
export type StatusKerja = "belum_mulai" | "sedang_berjalan" | "selesai" | "pending";
export type StatusValidasi = "menunggu" | "disetujui" | "ditolak" | "direvisi";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  karyawan: "Karyawan",
  magang: "Anak Magang",
};

export const STATUS_KERJA_LABEL: Record<StatusKerja, string> = {
  belum_mulai: "Belum Mulai",
  sedang_berjalan: "Sedang Berjalan",
  selesai: "Selesai",
  pending: "Pending",
};

export const STATUS_VALIDASI_LABEL: Record<StatusValidasi, string> = {
  menunggu: "Menunggu Validasi",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  direvisi: "Direvisi",
};

export const STATUS_VALIDASI_TONE: Record<StatusValidasi, string> = {
  menunggu: "bg-warning/15 text-warning-foreground border-warning/40",
  disetujui: "bg-success/15 text-success border-success/40",
  ditolak: "bg-destructive/10 text-destructive border-destructive/40",
  direvisi: "bg-info/15 text-info border-info/40",
};

export const STATUS_KERJA_TONE: Record<StatusKerja, string> = {
  belum_mulai: "bg-muted text-muted-foreground border-border",
  sedang_berjalan: "bg-info/15 text-info border-info/40",
  selesai: "bg-success/15 text-success border-success/40",
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
};

export const MAX_PHOTOS = 5;
export const PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png"];
export const PHOTO_BUCKET = "report-photos";

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function formatTanggal(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
