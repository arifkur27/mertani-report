import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { exportTemplate } from "@/lib/export";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/template")({
  head: () => ({
    meta: [
      { title: "Template Laporan Harian — Merapi Tani" },
      {
        name: "description",
        content: "Unduh format Excel laporan harian PT Merapi Tani Instrumen untuk pengisian manual.",
      },
      { property: "og:title", content: "Template Laporan Harian — Merapi Tani" },
      {
        property: "og:description",
        content: "Format resmi laporan harian siap unduh untuk arsip dan pengisian offline.",
      },
    ],
  }),
  component: TemplatePage,
});

const KOLOM = [
  ["Tanggal", "Tanggal laporan (format tahun-bulan-hari)"],
  ["Nama", "Nama lengkap pelapor"],
  ["Divisi", "Divisi tempat bertugas"],
  ["Jabatan", "Jabatan atau posisi"],
  ["Pekerjaan Kemarin", "Uraian pekerjaan yang sudah dilakukan"],
  ["Kendala", "Hambatan yang dihadapi"],
  ["Solusi", "Tindakan penyelesaian kendala"],
  ["Progress (%)", "Persentase penyelesaian 0-100"],
  ["Rencana Hari Ini", "Rencana kerja hari ini"],
  ["Durasi (Jam)", "Lama waktu kerja dalam jam"],
  ["Status Pekerjaan", "Belum Mulai / Sedang Berjalan / Selesai / Pending"],
  ["Status Validasi", "Diisi oleh supervisor"],
  ["Catatan", "Catatan tambahan"],
];

function TemplatePage() {
  return (
    <div>
      <PageHeader
        title="Template Laporan Harian"
        description="Format resmi pengisian laporan harian, dapat diunduh sebagai Excel."
        actions={
          <Button onClick={exportTemplate}>
            <Download className="size-4" /> Unduh Template Excel
          </Button>
        }
      />

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Penjelasan Kolom</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {KOLOM.map(([nama, ket]) => (
              <li key={nama} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{nama}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ket}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
