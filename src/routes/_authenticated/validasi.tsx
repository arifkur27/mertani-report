import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import { canValidate, useMe } from "@/lib/auth";
import { fetchReports, submitValidasi } from "@/lib/reports";
import {
  STATUS_VALIDASI_LABEL,
  STATUS_VALIDASI_TONE,
  formatTanggal,
  type StatusValidasi,
} from "@/lib/constants";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/validasi")({
  head: () => ({
    meta: [
      { title: "Validasi Laporan — Merapi Tani Instrumen" },
      {
        name: "description",
        content: "Supervisor dan admin memeriksa, menyetujui, atau meminta revisi laporan harian.",
      },
      { property: "og:title", content: "Validasi Laporan — Merapi Tani Instrumen" },
      {
        property: "og:description",
        content: "Antrean laporan harian yang menunggu persetujuan supervisor.",
      },
    ],
  }),
  component: ValidasiPage,
});

function ValidasiPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusValidasi | "">("menunggu");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = canValidate(me?.role);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", { status }],
    queryFn: () => fetchReports({ status }),
    enabled: !!me && allowed,
  });

  if (me && !allowed) {
    return (
      <div>
        <PageHeader
          title="Akses ditolak"
          description="Hanya supervisor dan admin yang dapat memvalidasi laporan."
        />
        <Button asChild variant="outline">
          <Link to="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </div>
    );
  }

  async function act(reportId: string, next: StatusValidasi) {
    if (!me) return;
    const catatan = (notes[reportId] ?? "").trim();
    if ((next === "ditolak" || next === "direvisi") && !catatan) {
      toast.error("Tulis catatan untuk revisi atau penolakan");
      return;
    }
    setBusyId(reportId);
    try {
      await submitValidasi({ reportId, supervisorId: me.id, status: next, catatan });
      await queryClient.invalidateQueries();
      toast.success(`Laporan ${STATUS_VALIDASI_LABEL[next].toLowerCase()}`);
      setNotes((n) => ({ ...n, [reportId]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui laporan");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Validasi Laporan"
        description="Periksa laporan harian tim Anda lalu setujui, minta revisi, atau tolak."
        actions={
          <Select
            value={status || "all"}
            onValueChange={(v) => setStatus(v === "all" ? "" : (v as StatusValidasi))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {Object.entries(STATUS_VALIDASI_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada laporan pada status ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((r) => (
            <Card key={r.id} className="shadow-card">
              <CardContent className="grid gap-4 pt-6 lg:grid-cols-3">
                <div className="lg:col-span-2 grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-semibold">{r.nama}</p>
                    <span className="text-xs text-muted-foreground">
                      {r.divisi_nama} • {formatTanggal(r.tanggal)}
                    </span>
                    <StatusPill
                      label={STATUS_VALIDASI_LABEL[r.status_validasi]}
                      tone={STATUS_VALIDASI_TONE[r.status_validasi]}
                    />
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm">{r.pekerjaan_kemarin}</p>
                  <p className="text-xs text-muted-foreground">
                    Progress {r.progress}% • {r.durasi_jam} jam • {r.photos.length} foto
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-fit">
                    <Link to="/laporan/$id" params={{ id: r.id }}>
                      <Eye className="size-4" /> Lihat detail
                    </Link>
                  </Button>
                </div>

                <div className="grid content-start gap-2">
                  <Textarea
                    rows={3}
                    placeholder="Catatan validasi..."
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "disetujui")}>
                      <Check className="size-4" /> Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, "direvisi")}
                    >
                      <RotateCcw className="size-4" /> Revisi
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, "ditolak")}
                    >
                      <X className="size-4" /> Tolak
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
