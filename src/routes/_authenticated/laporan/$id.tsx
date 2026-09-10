import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canValidate, useMe } from "@/lib/auth";
import { fetchReport, submitValidasi } from "@/lib/reports";
import {
  STATUS_KERJA_LABEL,
  STATUS_KERJA_TONE,
  STATUS_VALIDASI_LABEL,
  STATUS_VALIDASI_TONE,
  formatTanggal,
  type StatusValidasi,
} from "@/lib/constants";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { PhotoGrid } from "@/components/photo-grid";
import { ReportForm } from "@/components/report-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/laporan/$id")({
  head: () => ({
    meta: [
      { title: "Detail Laporan Harian — Merapi Tani Instrumen" },
      {
        name: "description",
        content: "Rincian laporan harian, foto bukti, dan status validasi supervisor.",
      },
      { property: "og:title", content: "Detail Laporan Harian — Merapi Tani Instrumen" },
      {
        property: "og:description",
        content: "Rincian pekerjaan, kendala, progress, foto bukti, dan catatan validasi.",
      },
    ],
  }),
  component: LaporanDetail,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

function LaporanDetail() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReport(id),
  });

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-lg" />;
  }

  if (!report) {
    return (
      <div>
        <PageHeader title="Laporan tidak ditemukan" description="Laporan mungkin sudah dihapus." />
        <Button asChild variant="outline">
          <Link to="/laporan">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
      </div>
    );
  }

  const isOwner = me?.id === report.user_id;
  const canEdit = isOwner && report.status_validasi !== "disetujui";
  const canReview = canValidate(me?.role) && !isOwner;

  async function validate(status: StatusValidasi) {
    if (!me) return;
    if ((status === "ditolak" || status === "direvisi") && !catatan.trim()) {
      toast.error("Tulis catatan untuk revisi atau penolakan");
      return;
    }
    setBusy(true);
    try {
      await submitValidasi({
        reportId: report!.id,
        supervisorId: me.id,
        status,
        catatan: catatan.trim(),
      });
      await queryClient.invalidateQueries();
      toast.success(`Laporan ${STATUS_VALIDASI_LABEL[status].toLowerCase()}`);
      setCatatan("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui validasi");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const { error } = await supabase.from("daily_reports").delete().eq("id", report!.id);
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success("Laporan dihapus");
      navigate({ to: "/laporan" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus laporan");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div>
        <PageHeader
          title="Ubah Laporan"
          description="Perubahan akan dikirim ulang untuk divalidasi."
          actions={
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Batal ubah
            </Button>
          }
        />
        <ReportForm initial={report} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Laporan ${formatTanggal(report.tanggal)}`}
        description={`${report.nama} — ${report.divisi_nama}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/laporan">
                <ArrowLeft className="size-4" /> Kembali
              </Link>
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Ubah
              </Button>
            )}
            {(isOwner && report.status_validasi === "menunggu") || me?.role === "admin" ? (
              <Button variant="outline" size="sm" onClick={remove} disabled={busy}>
                <Trash2 className="size-4" /> Hapus
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Rincian Pekerjaan</CardTitle>
            <div className="flex gap-2">
              <StatusPill
                label={STATUS_KERJA_LABEL[report.status_pekerjaan]}
                tone={STATUS_KERJA_TONE[report.status_pekerjaan]}
              />
              <StatusPill
                label={STATUS_VALIDASI_LABEL[report.status_validasi]}
                tone={STATUS_VALIDASI_TONE[report.status_validasi]}
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Field label="Jabatan" value={report.jabatan ?? "-"} />
            <Field label="Pekerjaan kemarin" value={report.pekerjaan_kemarin} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Kendala" value={report.kendala ?? "-"} />
              <Field label="Solusi" value={report.solusi ?? "-"} />
            </div>
            <Field label="Rencana hari ini" value={report.rencana_hari_ini} />
            <Field label="Catatan" value={report.catatan ?? "-"} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Progress
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={report.progress} className="h-2 flex-1" />
                <span className="text-sm font-medium">{report.progress}%</span>
              </div>
            </div>
            <Field label="Durasi kerja" value={`${report.durasi_jam} jam`} />
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Foto Bukti</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGrid
                paths={report.photos.map((p) => p.photo_path)}
                namePrefix={`laporan-${report.tanggal}`}
              />
            </CardContent>
          </Card>

          {report.catatan_revisi && (
            <Card className="border-info/40 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Catatan Validator</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{report.catatan_revisi}</p>
              </CardContent>
            </Card>
          )}

          {canReview && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Validasi Laporan</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="catatan-validasi">Catatan (wajib untuk revisi/tolak)</Label>
                  <Textarea
                    id="catatan-validasi"
                    rows={3}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={() => validate("disetujui")}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => validate("direvisi")}
                  >
                    <RotateCcw className="size-4" /> Minta Revisi
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => validate("ditolak")}
                  >
                    <X className="size-4" /> Tolak
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
