import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ClipboardList,
  GraduationCap,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fetchReports } from "@/lib/reports";
import {
  STATUS_VALIDASI_LABEL,
  STATUS_VALIDASI_TONE,
  formatTanggal,
  todayISO,
  type StatusValidasi,
} from "@/lib/constants";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Merapi Tani Daily Report System" },
      {
        name: "description",
        content:
          "Ringkasan laporan harian, statistik divisi, dan progres kerja karyawan serta anak magang PT Merapi Tani Instrumen.",
      },
      { property: "og:title", content: "Dashboard — Merapi Tani Daily Report System" },
      {
        property: "og:description",
        content: "Statistik laporan harian dan progres tim PT Merapi Tani Instrumen.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data: me } = useMe();
  const today = todayISO();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: () => fetchReports(),
    enabled: !!me,
  });

  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts"],
    enabled: me?.role === "admin",
    queryFn: async () => {
      const [{ count: divisiCount }, { data: roles }] = await Promise.all([
        supabase.from("divisi").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
      ]);
      const list = roles ?? [];
      return {
        divisi: divisiCount ?? 0,
        karyawan: list.filter((r) => r.role === "karyawan" || r.role === "supervisor").length,
        magang: list.filter((r) => r.role === "magang").length,
      };
    },
  });

  const mine = reports.filter((r) => r.user_id === me?.id);
  const todayReports = reports.filter((r) => r.tanggal === today);
  const filledToday = mine.some((r) => r.tanggal === today);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      total: reports.filter((r) => r.tanggal === iso).length,
    };
  });

  const perDivisi = Object.entries(
    reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.divisi_nama] = (acc[r.divisi_nama] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([divisi, total]) => ({ divisi, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const statusCount = (s: StatusValidasi) => mine.filter((r) => r.status_validasi === s).length;
  const avgProgress = mine.length
    ? Math.round(mine.reduce((a, r) => a + r.progress, 0) / mine.length)
    : 0;

  const roleTitle =
    me?.role === "admin"
      ? "Dashboard Admin"
      : me?.role === "supervisor"
        ? `Dashboard Supervisor${me.divisi_nama ? ` — ${me.divisi_nama}` : ""}`
        : "Dashboard Saya";

  return (
    <div>
      <PageHeader
        title={roleTitle}
        description={`Selamat datang, ${me?.nama ?? ""}. Ringkasan aktivitas per ${formatTanggal(today)}.`}
        actions={
          <Button asChild>
            <Link to="/laporan/baru">Isi Laporan Hari Ini</Link>
          </Button>
        }
      />

      {!filledToday && (
        <Card className="mb-6 border-warning/40 bg-warning/10">
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <AlertTriangle className="size-5 text-warning-foreground" />
            <p className="text-sm font-medium">
              Laporan harian Anda untuk {formatTanggal(today)} belum diisi.
            </p>
            <Button asChild size="sm" variant="secondary" className="ml-auto">
              <Link to="/laporan/baru">Isi sekarang</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : me?.role === "admin" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Karyawan" value={counts?.karyawan ?? 0} icon={Users} />
          <StatCard label="Total Anak Magang" value={counts?.magang ?? 0} icon={GraduationCap} />
          <StatCard
            label="Report Hari Ini"
            value={todayReports.length}
            icon={ClipboardList}
            hint={`${reports.length} total laporan`}
          />
          <StatCard label="Total Divisi" value={counts?.divisi ?? 0} icon={Building2} />
        </div>
      ) : me?.role === "supervisor" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Report Divisi"
            value={reports.filter((r) => r.divisi_id === me.divisi_id).length}
            icon={ClipboardList}
          />
          <StatCard label="Report Hari Ini" value={todayReports.length} icon={ClipboardList} />
          <StatCard
            label="Menunggu Validasi"
            value={reports.filter((r) => r.status_validasi === "menunggu").length}
            icon={BadgeCheck}
          />
          <StatCard
            label="Anggota Aktif"
            value={new Set(reports.map((r) => r.user_id)).size}
            icon={Users}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Report Saya" value={mine.length} icon={ClipboardList} />
          <StatCard
            label="Report Hari Ini"
            value={mine.filter((r) => r.tanggal === today).length}
            icon={ClipboardList}
          />
          <StatCard label="Disetujui" value={statusCount("disetujui")} icon={BadgeCheck} />
          <StatCard label="Menunggu Validasi" value={statusCount("menunggu")} icon={AlertTriangle} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Grafik Aktivitas Harian</CardTitle>
            <CardDescription>Jumlah laporan 7 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--card-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Statistik Report Per Divisi</CardTitle>
            <CardDescription>Distribusi laporan berdasarkan divisi</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {perDivisi.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perDivisi}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="divisi"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--card-foreground)",
                    }}
                  />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Riwayat Aktivitas Terbaru</CardTitle>
            <CardDescription>
              {me?.role === "admin" || me?.role === "supervisor"
                ? "Laporan terbaru yang bisa Anda akses"
                : "Laporan harian yang pernah Anda buat"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(me?.role === "karyawan" || me?.role === "magang" ? mine : reports)
              .slice(0, 6)
              .map((r) => (
                <Link
                  key={r.id}
                  to="/laporan/$id"
                  params={{ id: r.id }}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.nama}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatTanggal(r.tanggal)} • {r.divisi_nama} • {r.progress}%
                    </p>
                  </div>
                  <StatusPill
                    label={STATUS_VALIDASI_LABEL[r.status_validasi]}
                    tone={STATUS_VALIDASI_TONE[r.status_validasi]}
                  />
                </Link>
              ))}
            {reports.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada laporan tercatat.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">
              {me?.role === "supervisor" ? "Progress Pekerjaan Tim" : "Progress Pekerjaan Saya"}
            </CardTitle>
            <CardDescription>Rata-rata progress laporan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rata-rata progress</span>
                <span className="font-semibold">{avgProgress}%</span>
              </div>
              <Progress value={avgProgress} />
            </div>
            {(["menunggu", "disetujui", "ditolak", "direvisi"] as StatusValidasi[]).map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <StatusPill label={STATUS_VALIDASI_LABEL[s]} tone={STATUS_VALIDASI_TONE[s]} />
                <span className="font-semibold">
                  {(me?.role === "karyawan" || me?.role === "magang" ? mine : reports).filter(
                    (r) => r.status_validasi === s,
                  ).length}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
