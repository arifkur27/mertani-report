import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/lib/auth";
import { fetchDivisi, fetchReports } from "@/lib/reports";
import { formatTanggal } from "@/lib/constants";
import { PageHeader } from "@/components/app-shell";
import { PhotoGrid } from "@/components/photo-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/galeri")({
  head: () => ({
    meta: [
      { title: "Galeri Bukti Kerja — Merapi Tani Instrumen" },
      {
        name: "description",
        content: "Kumpulan foto bukti pekerjaan harian tim PT Merapi Tani Instrumen.",
      },
      { property: "og:title", content: "Galeri Bukti Kerja — Merapi Tani Instrumen" },
      {
        property: "og:description",
        content: "Telusuri foto bukti pekerjaan berdasarkan divisi dan tanggal.",
      },
    ],
  }),
  component: GaleriPage,
});

function GaleriPage() {
  const { data: me } = useMe();
  const [divisiId, setDivisiId] = useState("");
  const [tanggal, setTanggal] = useState("");

  const { data: divisi = [] } = useQuery({ queryKey: ["divisi"], queryFn: fetchDivisi });
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", { divisiId, tanggal, galeri: true }],
    queryFn: () => fetchReports({ divisiId, tanggal }),
    enabled: !!me,
  });

  const withPhotos = reports.filter((r) => r.photos.length > 0);

  return (
    <div>
      <PageHeader
        title="Galeri Bukti Kerja"
        description="Foto bukti dari laporan harian, dikelompokkan per laporan."
      />

      <Card className="mb-6 shadow-card">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Divisi</Label>
            <Select value={divisiId || "all"} onValueChange={(v) => setDivisiId(v === "all" ? "" : v)}>
              <SelectTrigger>
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
          <div className="grid gap-2">
            <Label htmlFor="tgl">Tanggal</Label>
            <Input id="tgl" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : withPhotos.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada foto bukti untuk filter ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {withPhotos.map((r) => (
            <Card key={r.id} className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">
                  {r.nama} — {formatTanggal(r.tanggal)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{r.divisi_nama}</p>
              </CardHeader>
              <CardContent>
                <PhotoGrid
                  paths={r.photos.map((p) => p.photo_path)}
                  namePrefix={`${r.nama}-${r.tanggal}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
