import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, ClipboardList, Images, LineChart } from "lucide-react";
import { APP_NAME, COMPANY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Merapi Tani Instrumen Daily Report System" },
      {
        name: "description",
        content:
          "Sistem laporan harian PT Merapi Tani Instrumen: pencatatan pekerjaan, foto bukti, validasi supervisor, dan rekap ekspor.",
      },
      { property: "og:title", content: "Merapi Tani Instrumen Daily Report System" },
      {
        property: "og:description",
        content:
          "Catat pekerjaan harian, unggah foto bukti, dan pantau validasi supervisor dalam satu sistem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FITUR = [
  {
    icon: ClipboardList,
    title: "Laporan Harian Terstruktur",
    desc: "Pekerjaan kemarin, kendala, solusi, progress, durasi, dan rencana hari ini dalam satu formulir.",
  },
  {
    icon: Images,
    title: "Foto Bukti Pekerjaan",
    desc: "Lampirkan hingga lima foto per laporan, tersimpan aman dan hanya dapat diakses tim internal.",
  },
  {
    icon: BadgeCheck,
    title: "Validasi Supervisor",
    desc: "Supervisor menyetujui, meminta revisi, atau menolak laporan lengkap dengan catatan.",
  },
  {
    icon: LineChart,
    title: "Monitoring & Rekap",
    desc: "Statistik per divisi dan ekspor rekap ke Excel, CSV, atau PDF untuk arsip perusahaan.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-4 lg:px-10">
        <div className="grid size-10 place-items-center overflow-hidden rounded-lg bg-white">
          <img src="/mertani-logo.png" alt="Logo Mertani" className="size-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold">Merapi Tani Instrumen</p>
          <p className="truncate text-xs text-muted-foreground">Daily Report System</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/auth">Masuk</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="bg-brand-gradient px-4 py-20 text-center lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
            {COMPANY}
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-primary-foreground lg:text-5xl">
            {APP_NAME}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-primary-foreground/85">
            Satu tempat bagi karyawan dan anak magang untuk melaporkan aktivitas harian, mengunggah
            foto bukti, dan mendapatkan validasi supervisor.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Masuk ke Sistem</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/auth">Daftar Anak Magang</Link>
            </Button>
          </div>
        </section>

        <section className="px-4 py-16 lg:px-10">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight">
            Fitur Utama
          </h2>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2">
            {FITUR.map((f) => (
              <Card key={f.title} className="shadow-card">
                <CardContent className="flex gap-4 pt-6">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

          <footer className="border-t border-border px-4 py-10 lg:px-10">
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-4">
        <img
          src="/logo-udb.png"
          alt="Universitas Duta Bangsa Surakarta"
          className="h-20 w-20 object-contain"
        />

        <div className="text-left">
          <p className="text-sm text-muted-foreground">
            Website ini dibuat oleh mahasiswa
          </p>
          <p className="text-base font-semibold text-foreground">
            Universitas Duta Bangsa Surakarta
          </p>
        </div>
      </div>
    </footer>
    </div>
  );
}
