import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  STATUS_KERJA_LABEL,
  STATUS_VALIDASI_LABEL,
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
  doc.text("Merapi Tani Daily Report System", 40, 36);
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
