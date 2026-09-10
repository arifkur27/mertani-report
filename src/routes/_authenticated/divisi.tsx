import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fetchDivisi } from "@/lib/reports";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/divisi")({
  head: () => ({
    meta: [
      { title: "Data Divisi — Merapi Tani Instrumen" },
      {
        name: "description",
        content: "Kelola daftar divisi kerja PT Merapi Tani Instrumen untuk laporan harian.",
      },
      { property: "og:title", content: "Data Divisi — Merapi Tani Instrumen" },
      { property: "og:description", content: "Tambah, lihat, dan hapus divisi kerja perusahaan." },
    ],
  }),
  component: DivisiPage,
});

function DivisiPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: divisi = [], isLoading } = useQuery({ queryKey: ["divisi"], queryFn: fetchDivisi });

  if (me && me.role !== "admin") {
    return (
      <div>
        <PageHeader title="Akses ditolak" description="Hanya admin yang dapat mengelola divisi." />
        <Button asChild variant="outline">
          <Link to="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </div>
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("divisi")
        .insert({ nama_divisi: nama.trim(), deskripsi: deskripsi.trim() || null });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["divisi"] });
      setNama("");
      setDeskripsi("");
      toast.success("Divisi ditambahkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah divisi");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from("divisi").delete().eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["divisi"] });
      toast.success("Divisi dihapus");
    } catch {
      toast.error("Divisi tidak dapat dihapus karena masih dipakai");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Data Divisi" description="Daftar divisi kerja yang dipakai pada laporan harian." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Tambah Divisi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama divisi</Label>
                <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Textarea
                  id="deskripsi"
                  rows={3}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy}>
                <Plus className="size-4" /> Simpan
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Daftar Divisi</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : divisi.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada divisi.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divisi.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          {d.nama_divisi}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.deskripsi ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          aria-label="Hapus divisi"
                          onClick={() => remove(d.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
