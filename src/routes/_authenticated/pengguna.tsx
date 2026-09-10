import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fetchDivisi } from "@/lib/reports";
import { ROLE_LABEL, formatTanggal, type AppRole } from "@/lib/constants";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export const Route = createFileRoute("/_authenticated/pengguna")({
  head: () => ({
    meta: [
      { title: "Data Pengguna — Merapi Tani Instrumen" },
      {
        name: "description",
        content:
          "Kelola data karyawan dan anak magang: divisi, jabatan, dan status keaktifan.",
      },
      { property: "og:title", content: "Data Pengguna — Merapi Tani Instrumen" },
      {
        property: "og:description",
        content: "Daftar pengguna sistem laporan harian Merapi Tani Instrumen.",
      },
    ],
  }),
  component: PenggunaPage,
});

type ProfileRow = {
  id: string;
  nama: string;
  email: string | null;
  nik_nim: string | null;
  no_hp: string | null;
  jabatan: string | null;
  divisi_id: string | null;
  status_aktif: boolean;
  tanggal_bergabung: string;
};

type CreateUserForm = {
  nama: string;
  email: string;
  password: string;
  nik_nim: string;
  no_hp: string;
  jabatan: string;
  divisi_id: string;
  role: AppRole;
};

async function fetchProfiles(): Promise<
  (ProfileRow & { role: AppRole })[]
> {
  const [{ data: profiles, error }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, nama, email, nik_nim, no_hp, jabatan, divisi_id, status_aktif, tanggal_bergabung",
      )
      .order("status_aktif", { ascending: true })
      .order("nama"),

    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (error) throw error;

  const order: AppRole[] = [
    "admin",
    "supervisor",
    "karyawan",
    "magang",
  ];

  const roleMap = new Map<string, AppRole[]>();

  for (const r of roles ?? []) {
    const list = roleMap.get(r.user_id) ?? [];
    list.push(r.role as AppRole);
    roleMap.set(r.user_id, list);
  }

  return (profiles ?? []).map((p) => ({
    ...p,
    role:
      order.find((r) =>
        (roleMap.get(p.id) ?? []).includes(r),
      ) ?? "magang",
  }));
}

function PenggunaPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState<CreateUserForm>({
    nama: "",
    email: "",
    password: "",
    nik_nim: "",
    no_hp: "",
    jabatan: "",
    divisi_id: "",
    role: "karyawan",
  });

  const { data: divisi = [] } = useQuery({
    queryKey: ["divisi"],
    queryFn: fetchDivisi,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
    enabled: me?.role === "admin",
  });

  if (me && me.role !== "admin") {
    return (
      <div>
        <PageHeader
          title="Akses ditolak"
          description="Hanya admin yang dapat melihat data pengguna."
        />

        <Button asChild variant="outline">
          <Link to="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </div>
    );
  }

  async function update(
    id: string,
    patch: Partial<ProfileRow>,
  ) {
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id);

    if (error) {
      toast.error("Gagal memperbarui pengguna");
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["profiles"],
    });

    toast.success("Data pengguna diperbarui");
  }

  async function createUser() {
    if (!form.nama.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Email wajib diisi");
      return;
    }

    if (!form.password) {
      toast.error("Password wajib diisi");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } =
        await supabase.functions.invoke("create-user", {
          body: {
            nama: form.nama.trim(),
            email: form.email.trim(),
            password: form.password,
            nik_nim: form.nik_nim.trim() || null,
            no_hp: form.no_hp.trim() || null,
            jabatan: form.jabatan.trim() || null,
            divisi_id: form.divisi_id || null,
            role: form.role,
          },
        });

      if (error) {
        // Supabase Functions often puts the useful JSON error in the
        // response context rather than in error.message.
        let message = error.message;
        const context = (error as { context?: Response }).context;

        if (context) {
          try {
            const body = (await context.clone().json()) as {
              error?: string;
            };
            if (body.error) message = body.error;
          } catch {
            // Keep the original Functions error when the response is not JSON.
          }
        }

        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Akun pengguna berhasil dibuat");

      setForm({
        nama: "",
        email: "",
        password: "",
        nik_nim: "",
        no_hp: "",
        jabatan: "",
        divisi_id: "",
        role: "karyawan",
      });

      setOpenCreateUser(false);

      await queryClient.invalidateQueries({
        queryKey: ["profiles"],
      });
    } catch (error) {
      console.error("createUser error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Gagal membuat akun pengguna";

      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  const filtered = users.filter((u) =>
    [u.nama, u.email ?? "", u.nik_nim ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Data Pengguna"
          description="Atur divisi dan status keaktifan karyawan serta anak magang."
        />

        <Button
          onClick={() => setOpenCreateUser(true)}
          className="mt-1"
        >
          <UserPlus className="mr-2 size-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Dialog Tambah Pengguna */}
      <Dialog
        open={openCreateUser}
        onOpenChange={(open) => {
          if (!isCreating) {
            setOpenCreateUser(open);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna</DialogTitle>

            <DialogDescription>
              Buat akun login baru untuk karyawan atau anak magang.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nama */}
            <div className="grid gap-2">
              <Label htmlFor="nama">
                Nama Lengkap <span className="text-destructive">*</span>
              </Label>

              <Input
                id="nama"
                placeholder="Contoh: Budi Santoso"
                value={form.nama}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nama: e.target.value,
                  })
                }
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="nama@perusahaan.com"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">
                Password Awal{" "}
                <span className="text-destructive">*</span>
              </Label>

              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
              />

              <p className="text-xs text-muted-foreground">
                Berikan password awal kepada karyawan. Karyawan dapat
                menggantinya setelah login.
              </p>
            </div>

            {/* NIK dan No HP */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nik_nim">NIK / NIM</Label>

                <Input
                  id="nik_nim"
                  placeholder="NIK / NIM"
                  value={form.nik_nim}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nik_nim: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="no_hp">No. HP</Label>

                <Input
                  id="no_hp"
                  placeholder="08xxxxxxxxxx"
                  value={form.no_hp}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      no_hp: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Jabatan */}
            <div className="grid gap-2">
              <Label htmlFor="jabatan">Jabatan</Label>

              <Input
                id="jabatan"
                placeholder="Contoh: Staff Produksi"
                value={form.jabatan}
                onChange={(e) =>
                  setForm({
                    ...form,
                    jabatan: e.target.value,
                  })
                }
              />
            </div>

            {/* Divisi */}
            <div className="grid gap-2">
              <Label>Divisi</Label>

              <Select
                value={form.divisi_id || "none"}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    divisi_id:
                      value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih divisi" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">
                    Tanpa divisi
                  </SelectItem>

                  {divisi.map((d) => (
                    <SelectItem
                      key={d.id}
                      value={d.id}
                    >
                      {d.nama_divisi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="grid gap-2">
              <Label>Peran</Label>

              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    role: value as AppRole,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="admin">
                    Admin
                  </SelectItem>

                  <SelectItem value="karyawan">
                    Karyawan
                  </SelectItem>

                  <SelectItem value="magang">
                    Magang
                  </SelectItem>

                  <SelectItem value="supervisor">
                    Supervisor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isCreating}
              onClick={() => setOpenCreateUser(false)}
            >
              Batal
            </Button>

            <Button
              type="button"
              disabled={isCreating}
              onClick={createUser}
            >
              {isCreating
                ? "Membuat Akun..."
                : "Buat Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pencarian */}
      <Card className="mb-4 shadow-card">
        <CardContent className="grid gap-2 pt-6 sm:max-w-sm">
          <Label htmlFor="cari">
            Cari pengguna
          </Label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="cari"
              className="pl-9"
              placeholder="Nama, email, atau NIK/NIM"
              value={q}
              onChange={(e) =>
                setQ(e.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Daftar Pengguna */}
      <Card className="shadow-card">
        <CardContent className="overflow-x-auto pt-6">
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada pengguna yang cocok.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead>Aktif</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">
                        {u.nama}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {u.nik_nim ?? "-"}
                      </p>
                    </TableCell>

                    <TableCell className="text-sm">
                      <p>{u.email ?? "-"}</p>

                      <p className="text-xs text-muted-foreground">
                        {u.no_hp ?? "-"}
                      </p>
                    </TableCell>

                    <TableCell className="text-sm">
                      {ROLE_LABEL[u.role]}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={u.divisi_id ?? "none"}
                        onValueChange={(v) =>
                          update(u.id, {
                            divisi_id:
                              v === "none"
                                ? null
                                : v,
                          })
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Pilih divisi" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="none">
                            Tanpa divisi
                          </SelectItem>

                          {divisi.map((d) => (
                            <SelectItem
                              key={d.id}
                              value={d.id}
                            >
                              {d.nama_divisi}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="text-sm">
                      {formatTanggal(
                        u.tanggal_bergabung,
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.status_aktif}
                          onCheckedChange={(v) =>
                            update(u.id, {
                              status_aktif: v,
                            })
                          }
                          aria-label="Status aktif"
                        />

                        {!u.status_aktif && (
                          <span className="whitespace-nowrap text-xs text-warning-foreground">
                            Menunggu persetujuan
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}