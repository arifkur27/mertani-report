import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { fetchDivisi } from "@/lib/reports";
import { APP_NAME, COMPANY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Merapi Tani Instrumen Daily Report System" },
      {
        name: "description",
        content:
          "Halaman masuk dan pendaftaran anak magang untuk sistem laporan harian PT Merapi Tani Instrumen.",
      },
      { property: "og:title", content: "Masuk — Merapi Tani Instrumen Daily Report System" },
      {
        property: "og:description",
        content: "Login karyawan dan pendaftaran anak magang PT Merapi Tani Instrumen.",
      },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email tidak valid" }).max(255),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }).max(72),
});

const registerSchema = loginSchema.extend({
  nama: z.string().trim().min(3, { message: "Nama minimal 3 karakter" }).max(100),
  nik_nim: z.string().trim().min(3, { message: "NIK/NIM wajib diisi" }).max(30),
  no_hp: z.string().trim().min(8, { message: "Nomor HP tidak valid" }).max(20),
  divisi_id: z.string().uuid({ message: "Pilih divisi" }),
  jabatan: z.string().trim().max(60).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const { data: divisi = [] } = useQuery({ queryKey: ["divisi-public"], queryFn: fetchDivisi });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error("Gagal masuk: " + error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid");
      return;
    }
    const { email: rawEmail, password, ...meta } = parsed.data;
    const email = rawEmail.toLowerCase();

    setLoading(true);
    const { data: allowed, error: allowlistError } = await supabase.rpc(
      "is_registration_email_allowed",
      { p_email: email },
    );
    if (allowlistError) {
      setLoading(false);
      toast.error("Pendaftaran belum dapat diproses. Silakan coba lagi nanti.");
      return;
    }
    if (!allowed) {
      setLoading(false);
      toast.error("Email ini belum didaftarkan oleh Admin.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { ...meta, jabatan: meta.jabatan || "Anak Magang", role: "magang" },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Gagal mendaftar: " + error.message);
      return;
    }
    toast.success("Pendaftaran berhasil. Silakan cek email untuk konfirmasi akun Anda.");
    setMode("login");
  }

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!z.string().email().safeParse(email).success) {
      toast.error("Email tidak valid");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tautan reset password telah dikirim ke email Anda");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-brand-gradient p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center overflow-hidden rounded-xl bg-white">
            <img src="/mertani-logo.png" alt="Logo Mertani" className="size-full object-contain" />
          </div>
          <div>
            <p className="font-display text-lg font-bold">Merapi Tani Instrumen</p>
            <p className="text-sm opacity-80">Daily Report System</p>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Pelaporan aktivitas harian yang rapi, terukur, dan tervalidasi.
          </h2>
          <p className="mt-4 text-sm opacity-85">
            Karyawan dan anak magang {COMPANY} mengisi laporan harian, supervisor memvalidasi,
            manajemen memantau progres tiap divisi dalam satu sistem.
          </p>
          <ul className="mt-6 space-y-2 text-sm opacity-85">
            <li>• Laporan harian dengan bukti foto pekerjaan</li>
            <li>• Validasi berjenjang oleh supervisor divisi</li>
            <li>• Monitoring & ekspor CSV, Excel, PDF</li>
          </ul>
        </div>
        <div className="flex items-center gap-3">
          <img
            src="/logo-udb.png"
            alt="Universitas Duta Bangsa Surakarta"
            className="h-16 w-16 object-contain"
          />
        <div>
          <p className="text-xs opacity-70">
            Website ini dibuat oleh mahasiswa
          </p>
          <p className="text-sm font-semibold">
            Universitas Duta Bangsa Surakarta
          </p>
        </div>
      </div>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <p className="font-display font-bold">Merapi Tani Instrumen</p>
            <ThemeToggle />
          </div>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">{APP_NAME}</CardTitle>
              <CardDescription>
                Masuk dengan akun perusahaan. Pendaftaran hanya untuk email yang sudah diizinkan
                Admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Daftar Magang</TabsTrigger>
                  <TabsTrigger value="reset">Reset</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" name="email" type="email" required maxLength={255} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        required
                        maxLength={72}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="size-4 animate-spin" />} Masuk
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-nama">Nama Lengkap</Label>
                      <Input id="reg-nama" name="nama" required maxLength={100} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="reg-nim">NIK / NIM</Label>
                        <Input id="reg-nim" name="nik_nim" required maxLength={30} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-hp">Nomor HP</Label>
                        <Input id="reg-hp" name="no_hp" required maxLength={20} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-divisi">Divisi</Label>
                      <Select name="divisi_id" required>
                        <SelectTrigger id="reg-divisi">
                          <SelectValue placeholder="Pilih divisi" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisi.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nama_divisi}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input id="reg-email" name="email" type="email" required maxLength={255} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        maxLength={72}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="size-4 animate-spin" />} Daftar sebagai Anak
                      Magang
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="reset">
                  <form onSubmit={handleReset} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Masukkan email terdaftar, kami kirimkan tautan untuk membuat password baru.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input id="reset-email" name="email" type="email" required maxLength={255} />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="size-4 animate-spin" />} Kirim Tautan Reset
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Akun karyawan dan supervisor dibuat oleh Admin melalui menu Data Pengguna.
          </p>
        </div>
      </div>
    </div>
  );
}
