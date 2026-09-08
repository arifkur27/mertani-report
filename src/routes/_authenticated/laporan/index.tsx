import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Plus, Search } from "lucide-react";
import { useMe, canExport } from "@/lib/auth";
import { fetchDivisi, fetchReports, type ReportFilters } from "@/lib/reports";
import {
  STATUS_KERJA_LABEL,
  STATUS_VALIDASI_LABEL,
  STATUS_VALIDASI_TONE,
  formatTanggal,
  type StatusValidasi,
} from "@/lib/constants";
import { exportCSV, exportPDF, exportXLSX, type ExportRow } from "@/lib/export";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/laporan/")({
  head: () => ({
    meta: [
      { title: "Laporan Harian — Merapi Tani Daily Report System" },
      {
        name: "description",
        content:
          "Daftar laporan harian karyawan dan anak magang, lengkap dengan filter divisi, tanggal, status validasi, dan ekspor data.",
      },
      { property: "og:title", content: "Laporan Harian — Merapi Tani Daily Report System" },
      {
        property: "og:description",
        content: "Kelola dan pantau seluruh laporan harian tim PT Merapi Tani Instrumen.",
      },
    ],
  }),
  component: LaporanList,
});

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function LaporanList() {
  const { data: me } = useMe();
  const [filters, setFilters] = useState<ReportFilters>({});
  const { data: divisi = [] } = useQuery({ queryKey: ["divisi"], queryFn: fetchDivisi });
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchReports(filters),
    enabled: !!me,
  });

  const rows: ExportRow[] = reports.map((r) => ({
    tanggal: formatTanggal(r.tanggal),
    nama: r.nama,
    divisi: r.divisi_nama,
    jabatan: r.jabatan ?? "-",
    pekerjaan_kemarin: r.pekerjaan_kemarin,
    kendala: r.kendala ?? "-",
    solusi: r.solusi ?? "-",
    progress: r.progress,
    rencana_hari_ini: r.rencana_hari_ini,
    durasi_jam: r.durasi_jam,
    status_pekerjaan: r.status_pekerjaan,
    status_validasi: r.status_validasi,
    catatan: r.catatan ?? "-",
  }));

  const set = (key: keyof ReportFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value === "all" ? "" : value }));

  return (
    <div>
      <PageHeader
        title="Laporan Harian"
        description="Cari, filter, dan tinjau laporan aktivitas harian."
        actions={
          <>
            {canExport(me?.role) && (
              <>
                <Button variant="outline" size="sm" onClick={() => exportCSV(rows, "laporan-harian")}>
                  <Download className="size-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportXLSX(rows, "laporan-harian")}>
                  <FileSpreadsheet className="size-4" /> Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPDF(rows, "laporan-harian", "Rekap Laporan Harian")}
                >
                  <FileText className="size-4" /> PDF
                </Button>
              </>
            )}
            <Button asChild size="sm">
              <Link to="/laporan/baru">
                <Plus className="size-4" /> Laporan Baru
              </Link>
            </Button>
          </>
        }
      />

      <Card className="mb-4 shadow-card">
        <CardContent className="grid gap-3 pt-6 md:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="f-nama">Nama</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="f-nama"
                className="pl-8"
                placeholder="Cari nama…"
                maxLength={100}
                value={filters.nama ?? ""}
                onChange={(e) => set("nama", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-divisi">Divisi</Label>
            <Select value={filters.divisiId || "all"} onValueChange={(v) => set("divisiId", v)}>
              <SelectTrigger id="f-divisi">
                <SelectValue placeholder="Semua divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua divisi</SelectItem>
                {divisi.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nama_divisi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-tanggal">Tanggal</Label>
            <Input
              id="f-tanggal"
              type="date"
              value={filters.tanggal ?? ""}
              onChange={(e) => set("tanggal", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-bulan">Bulan</Label>
            <Select value={filters.bulan || "all"} onValueChange={(v) => set("bulan", v)}>
              <SelectTrigger id="f-bulan">
                <SelectValue placeholder="Semua bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua bulan</SelectItem>
                {BULAN.map((b, i) => (
                  <SelectItem key={b} value={String(i + 1)}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-status">Status Validasi</Label>
            <Select value={filters.status || "all"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger id="f-status">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                {(["menunggu", "disetujui", "ditolak", "direvisi"] as StatusValidasi[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_VALIDASI_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead className="w-32">Progress</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatTanggal(r.tanggal)}
                      </TableCell>
                      <TableCell className="font-medium">{r.nama}</TableCell>
                      <TableCell>{r.divisi_nama}</TableCell>
                      <TableCell className="max-w-64 truncate">{r.pekerjaan_kemarin}</TableCell>
                      <TableCell>
                        <Progress value={r.progress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{r.progress}%</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.durasi_jam} jam</TableCell>
                      <TableCell>
                        <StatusPill
                          label={STATUS_VALIDASI_LABEL[r.status_validasi]}
                          tone={STATUS_VALIDASI_TONE[r.status_validasi]}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/laporan/$id" params={{ id: r.id }}>
                            Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        Tidak ada laporan yang sesuai filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
