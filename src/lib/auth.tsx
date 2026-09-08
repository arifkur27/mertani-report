import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./constants";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 30_000,
  });
}

export type Me = {
  id: string;
  email: string | null;
  nama: string;
  nik_nim: string | null;
  no_hp: string | null;
  jabatan: string | null;
  divisi_id: string | null;
  divisi_nama: string | null;
  foto_profil: string | null;
  tanggal_bergabung: string;
  status_aktif: boolean;
  role: AppRole;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*, divisi:divisi_id(nama_divisi)")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const order: AppRole[] = ["admin", "supervisor", "karyawan", "magang"];
      const found = (roles ?? []).map((r) => r.role as AppRole);
      const role = order.find((r) => found.includes(r)) ?? "magang";

      return {
        id: user.id,
        email: user.email ?? profile?.email ?? null,
        nama: profile?.nama || user.email?.split("@")[0] || "Pengguna",
        nik_nim: profile?.nik_nim ?? null,
        no_hp: profile?.no_hp ?? null,
        jabatan: profile?.jabatan ?? null,
        divisi_id: profile?.divisi_id ?? null,
        divisi_nama:
          (profile?.divisi as { nama_divisi: string } | null)?.nama_divisi ?? null,
        foto_profil: profile?.foto_profil ?? null,
        tanggal_bergabung: profile?.tanggal_bergabung ?? "",
        status_aktif: profile?.status_aktif ?? true,
        role,
      };
    },
    staleTime: 60_000,
  });
}

export function canValidate(role?: AppRole) {
  return role === "admin" || role === "supervisor";
}

export function canExport(role?: AppRole) {
  return role === "admin" || role === "supervisor";
}
