import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fetchDivisi } from "@/lib/reports";
import { ROLE_LABEL, formatTanggal } from "@/lib/constants";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil Saya — Merapi Tani" },
      {
        name: "description",
        content: "Perbarui data diri, kontak, divisi, dan kata sandi akun laporan harian Anda.",
      },
      { property: "og:title", content: "Profil Saya — Merapi Tani" },
      { property: "og:description", content: "Kelola data diri dan keamanan akun Anda." },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const { data: divisi = [] } = useQuery({ queryKey: ["divisi"], queryFn: fetchDivisi });
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [form, setForm] = useState({
    nama: "",
    nik_nim: "",
    no_hp: "",
    jabatan: "",
    divisi_id: "",
  });

  useEffect(() => {
    if (!me) return;
    setForm({
      nama: me.nama,
      nik_nim: me.nik_nim ?? "",
      no_hp: me.no_hp ?? "",
      jabatan: me.jabatan ?? "",
      divisi_id: me.divisi_id ?? "",
    });
  }, [me]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nama: form.nama,
          nik_nim: form.nik_nim || null,
          no_hp: form.no_hp || null,
          jabatan: form.jabatan || null,
          divisi_id: form.divisi_id || null,
        })
        .eq("id", me.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profil diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui profil");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Kata sandi minimal 8 karakter");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      toast.success("Kata sandi diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui kata sandi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Profil Saya"
        description={
          me ? `${ROLE_LABEL[me.role]} • bergabung ${formatTanggal(me.tanggal_bergabung)}` : ""
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Data Diri</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="nama">Nama lengkap</Label>
                <Input
                  id="nama"
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nik">NIK / NIM</Label>
                <Input
                  id="nik"
                  value={form.nik_nim}
                  onChange={(e) => setForm((f) => ({ ...f, nik_nim: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hp">Nomor HP</Label>
                <Input
                  id="hp"
                  value={form.no_hp}
                  onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jabatan">Jabatan</Label>
                <Input
                  id="jabatan"
                  value={form.jabatan}
                  onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Divisi</Label>
                <Select
                  value={form.divisi_id || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, divisi_id: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa divisi</SelectItem>
                    {divisi.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nama_divisi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Email</Label>
                <Input value={me?.email ?? ""} disabled />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Simpan Profil
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Ganti Kata Sandi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pw">Kata sandi baru</Label>
                <Input
                  id="pw"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Minimal 8 karakter"
                />
              </div>
              <Button type="submit" variant="outline" disabled={busy}>
                Perbarui Kata Sandi
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
