import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import {
  MAX_PHOTOS,
  PHOTO_BUCKET,
  PHOTO_TYPES,
  STATUS_KERJA_LABEL,
  todayISO,
  type StatusKerja,
} from "@/lib/constants";
import type { ReportRow } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  tanggal: string;
  jabatan: string;
  pekerjaan_kemarin: string;
  kendala: string;
  solusi: string;
  progress: number;
  rencana_hari_ini: string;
  durasi_jam: string;
  status_pekerjaan: StatusKerja;
  catatan: string;
};

export function ReportForm({ initial }: { initial?: ReportRow }) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState<FormState>({
    tanggal: initial?.tanggal ?? todayISO(),
    jabatan: initial?.jabatan ?? "",
    pekerjaan_kemarin: initial?.pekerjaan_kemarin ?? "",
    kendala: initial?.kendala ?? "",
    solusi: initial?.solusi ?? "",
    progress: initial?.progress ?? 0,
    rencana_hari_ini: initial?.rencana_hari_ini ?? "",
    durasi_jam: initial ? String(initial.durasi_jam) : "",
    status_pekerjaan: initial?.status_pekerjaan ?? "sedang_berjalan",
    catatan: initial?.catatan ?? "",
  });

  const existingCount = initial?.photos.length ?? 0;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const invalid = picked.find((f) => !PHOTO_TYPES.includes(f.type));
    if (invalid) {
      toast.error("Format foto harus JPG atau PNG");
      return;
    }
    const tooBig = picked.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      toast.error("Ukuran setiap foto maksimal 5 MB");
      return;
    }
    const total = existingCount + files.length + picked.length;
    if (total > MAX_PHOTOS) {
      toast.error(`Maksimal ${MAX_PHOTOS} foto per laporan`);
      return;
    }
    setFiles((prev) => [...prev, ...picked]);
  }

  async function uploadPhotos(reportId: string, userId: string) {
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${reportId}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
      if (error) throw error;
      const { error: insErr } = await supabase
        .from("report_photos")
        .insert({ report_id: reportId, photo_path: path });
      if (insErr) throw insErr;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    if (!form.pekerjaan_kemarin.trim() || !form.rencana_hari_ini.trim()) {
      toast.error("Pekerjaan kemarin dan rencana hari ini wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tanggal: form.tanggal,
        jabatan: form.jabatan || me.jabatan,
        pekerjaan_kemarin: form.pekerjaan_kemarin,
        kendala: form.kendala || null,
        solusi: form.solusi || null,
        progress: form.progress,
        rencana_hari_ini: form.rencana_hari_ini,
        durasi_jam: form.durasi_jam ? Number(form.durasi_jam) : 0,
        status_pekerjaan: form.status_pekerjaan,
        catatan: form.catatan || null,
      };

      let reportId = initial?.id;
      if (initial) {
        const { error } = await supabase
          .from("daily_reports")
          .update({ ...payload, status_validasi: "menunggu", catatan_revisi: null })
          .eq("id", initial.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("daily_reports")
          .insert({ ...payload, user_id: me.id, divisi_id: me.divisi_id })
          .select("id")
          .single();
        if (error) throw error;
        reportId = data.id;
      }

      if (reportId && files.length) await uploadPhotos(reportId, me.id);

      await queryClient.invalidateQueries();
      toast.success(initial ? "Laporan diperbarui" : "Laporan harian tersimpan");
      navigate({ to: "/laporan" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan laporan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Detail Pekerjaan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input
                id="tanggal"
                type="date"
                value={form.tanggal}
                max={todayISO()}
                onChange={(e) => set("tanggal", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jabatan">Jabatan / Posisi</Label>
              <Input
                id="jabatan"
                value={form.jabatan}
                placeholder={me?.jabatan ?? "Contoh: Teknisi Lapangan"}
                onChange={(e) => set("jabatan", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pekerjaan">Pekerjaan yang dilakukan kemarin</Label>
            <Textarea
              id="pekerjaan"
              rows={4}
              value={form.pekerjaan_kemarin}
              onChange={(e) => set("pekerjaan_kemarin", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="kendala">Kendala</Label>
              <Textarea
                id="kendala"
                rows={3}
                value={form.kendala}
                onChange={(e) => set("kendala", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="solusi">Solusi</Label>
              <Textarea
                id="solusi"
                rows={3}
                value={form.solusi}
                onChange={(e) => set("solusi", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rencana">Rencana kerja hari ini</Label>
            <Textarea
              id="rencana"
              rows={3}
              value={form.rencana_hari_ini}
              onChange={(e) => set("rencana_hari_ini", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="catatan">Catatan tambahan</Label>
            <Textarea
              id="catatan"
              rows={2}
              value={form.catatan}
              onChange={(e) => set("catatan", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 content-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress & Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3">
              <Label>Progress: {form.progress}%</Label>
              <Slider
                value={[form.progress]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => set("progress", v[0] ?? 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="durasi">Durasi kerja (jam)</Label>
              <Input
                id="durasi"
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={form.durasi_jam}
                onChange={(e) => set("durasi_jam", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status pekerjaan</Label>
              <Select
                value={form.status_pekerjaan}
                onValueChange={(v) => set("status_pekerjaan", v as StatusKerja)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_KERJA_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto Bukti</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-xs text-muted-foreground">
              JPG/PNG, maksimal 5 MB per foto, {MAX_PHOTOS} foto per laporan.
              {existingCount ? ` Sudah ada ${existingCount} foto.` : ""}
            </p>
            <Label
              htmlFor="foto"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground hover:bg-muted/50"
            >
              <Upload className="size-4" /> Pilih foto
            </Label>
            <input
              id="foto"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => pickFiles(e.target.files)}
            />
            {files.length > 0 && (
              <ul className="grid gap-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
                  >
                    <span className="truncate flex-1">{f.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Hapus foto"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {initial ? "Simpan Perubahan" : "Kirim Laporan"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/laporan" })}>
            Batal
          </Button>
        </div>
      </div>
    </form>
  );
}
