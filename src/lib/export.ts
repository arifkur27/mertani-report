import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ROLE_LABEL,
  STATUS_KERJA_LABEL,
  STATUS_VALIDASI_LABEL,
  type AppRole,
  type StatusKerja,
  type StatusValidasi,
  formatTanggal,
} from "./constants";

export type ExportRow = {
  tanggal: string;
  nama: string;
  divisi: string;
  jabatan: string;
  pekerjaan_kemarin: string;
  kendala: string;
  solusi: string;
  progress: number;
  rencana_hari_ini: string;
  durasi_jam: number;
  status_pekerjaan: StatusKerja;
  status_validasi: StatusValidasi;
  catatan: string;
};

const HEADERS = [
  "Tanggal",
  "Nama",
  "Divisi",
  "Jabatan",
  "Pekerjaan Kemarin",
  "Kendala",
  "Solusi",
  "Solusi Progress (%)",
  "Rencana Hari Ini",
  "Durasi (Jam)",
  "Status Pekerjaan",
  "Status Validasi",
  "Catatan",
];

function toMatrix(rows: ExportRow[]) {
  return rows.map((r) => [
    formatTanggal(r.tanggal),
    r.nama,
    r.divisi,
    r.jabatan,
    r.pekerjaan_kemarin,
    r.kendala,
    r.solusi,
    r.progress,
    r.rencana_hari_ini,
    r.durasi_jam,
    STATUS_KERJA_LABEL[r.status_pekerjaan],
    STATUS_VALIDASI_LABEL[r.status_validasi],
    r.catatan,
  ]);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: ExportRow[], filename: string) {
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [HEADERS, ...toMatrix(rows)]
    .map((line) => line.map(escape).join(";"))
    .join("\r\n");
  saveBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export function exportXLSX(rows: ExportRow[], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...toMatrix(rows)]);
  ws["!cols"] = HEADERS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPDF(rows: ExportRow[], filename: string, subtitle: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Merapi Tani Instrumen Daily Report System", 40, 36);
  doc.setFontSize(9);
  doc.text(`PT Merapi Tani Instrumen — ${subtitle}`, 40, 52);
  autoTable(doc, {
    head: [HEADERS],
    body: toMatrix(rows).map((r) => r.map((c) => String(c ?? ""))),
    startY: 68,
    styles: { fontSize: 6.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    theme: "grid",
  });
  doc.save(`${filename}.pdf`);
}

export type UserExportRow = {
  nama: string;
  email: string;
  nik_nim: string;
  no_hp: string;
  jabatan: string;
  role: AppRole;
  divisi: string;
  status_aktif: boolean;
  tanggal_bergabung: string;
};

const USER_HEADERS = [
  "Nama Lengkap",
  "Email",
  "NIK / NIM",
  "Nomor HP",
  "Jabatan",
  "Peran",
  "Divisi",
  "Status",
  "Tanggal Bergabung",
];

function userMatrix(rows: UserExportRow[]) {
  return rows.map((user) => [
    user.nama,
    user.email,
    user.nik_nim,
    user.no_hp,
    user.jabatan,
    ROLE_LABEL[user.role],
    user.divisi,
    user.status_aktif ? "Aktif" : "Menunggu persetujuan",
    formatTanggal(user.tanggal_bergabung),
  ]);
}

export function exportUsersCSV(rows: UserExportRow[], filename: string) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [USER_HEADERS, ...userMatrix(rows)]
    .map((line) => line.map(escape).join(";"))
    .join("\r\n");

  saveBlob(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`,
  );
}

export function exportUsersXLSX(rows: UserExportRow[], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([USER_HEADERS, ...userMatrix(rows)]);
  ws["!cols"] = USER_HEADERS.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Pengguna");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportUsersPDF(
  rows: UserExportRow[],
  filename: string,
  subtitle: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Merapi Tani Instrumen Daily Report System", 40, 36);
  doc.setFontSize(9);
  doc.text(`PT Merapi Tani Instrumen — ${subtitle}`, 40, 52);

  autoTable(doc, {
    head: [USER_HEADERS],
    body: userMatrix(rows).map((row) => row.map((cell) => String(cell ?? ""))),
    startY: 68,
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    theme: "grid",
  });

  doc.save(`${filename}.pdf`);
}

export function exportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS.filter((h) => !h.startsWith("Status Validasi")),
    [
      "2026-01-01",
      "Nama Lengkap",
      "IoT Development",
      "Staff",
      "Contoh pekerjaan kemarin",
      "Contoh kendala",
      "Contoh solusi",
      50,
      "Contoh rencana hari ini",
      8,
      "Sedang Berjalan",
      "Catatan tambahan",
    ],
  ]);
  ws["!cols"] = HEADERS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "template-laporan-harian-merapi-tani.xlsx");
}
