import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { ReportForm } from "@/components/report-form";

export const Route = createFileRoute("/_authenticated/laporan/baru")({
  head: () => ({
    meta: [
      { title: "Isi Laporan Harian — Merapi Tani Instrumen" },
      {
        name: "description",
        content: "Form pengisian laporan aktivitas harian karyawan dan anak magang Merapi Tani Instrumen.",
      },
      { property: "og:title", content: "Isi Laporan Harian — Merapi Tani Instrumen" },
      { property: "og:description", content: "Catat pekerjaan, kendala, progress, dan foto bukti." },
    ],
  }),
  component: LaporanBaru,
});

function LaporanBaru() {
  return (
    <div>
      <PageHeader
        title="Isi Laporan Harian"
        description="Lengkapi aktivitas kerja Anda, lampirkan foto bukti bila ada."
      />
      <ReportForm />
    </div>
  );
}
