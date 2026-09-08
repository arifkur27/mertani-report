export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_reports: {
        Row: {
          catatan: string | null
          catatan_revisi: string | null
          created_at: string
          divisi_id: string | null
          durasi_jam: number
          id: string
          jabatan: string | null
          kendala: string | null
          pekerjaan_kemarin: string
          progress: number
          rencana_hari_ini: string
          solusi: string | null
          status_pekerjaan: Database["public"]["Enums"]["status_kerja"]
          status_validasi: Database["public"]["Enums"]["status_validasi"]
          tanggal: string
          user_id: string
        }
        Insert: {
          catatan?: string | null
          catatan_revisi?: string | null
          created_at?: string
          divisi_id?: string | null
          durasi_jam?: number
          id?: string
          jabatan?: string | null
          kendala?: string | null
          pekerjaan_kemarin?: string
          progress?: number
          rencana_hari_ini?: string
          solusi?: string | null
          status_pekerjaan?: Database["public"]["Enums"]["status_kerja"]
          status_validasi?: Database["public"]["Enums"]["status_validasi"]
          tanggal?: string
          user_id: string
        }
        Update: {
          catatan?: string | null
          catatan_revisi?: string | null
          created_at?: string
          divisi_id?: string | null
          durasi_jam?: number
          id?: string
          jabatan?: string | null
          kendala?: string | null
          pekerjaan_kemarin?: string
          progress?: number
          rencana_hari_ini?: string
          solusi?: string | null
          status_pekerjaan?: Database["public"]["Enums"]["status_kerja"]
          status_validasi?: Database["public"]["Enums"]["status_validasi"]
          tanggal?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_divisi_id_fkey"
            columns: ["divisi_id"]
            isOneToOne: false
            referencedRelation: "divisi"
            referencedColumns: ["id"]
          },
        ]
      }
      divisi: {
        Row: {
          created_at: string
          deskripsi: string | null
          id: string
          nama_divisi: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          nama_divisi: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          nama_divisi?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          divisi_id: string | null
          email: string | null
          foto_profil: string | null
          id: string
          jabatan: string | null
          nama: string
          nik_nim: string | null
          no_hp: string | null
          status_aktif: boolean
          tanggal_bergabung: string
        }
        Insert: {
          created_at?: string
          divisi_id?: string | null
          email?: string | null
          foto_profil?: string | null
          id: string
          jabatan?: string | null
          nama?: string
          nik_nim?: string | null
          no_hp?: string | null
          status_aktif?: boolean
          tanggal_bergabung?: string
        }
        Update: {
          created_at?: string
          divisi_id?: string | null
          email?: string | null
          foto_profil?: string | null
          id?: string
          jabatan?: string | null
          nama?: string
          nik_nim?: string | null
          no_hp?: string | null
          status_aktif?: boolean
          tanggal_bergabung?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_divisi_id_fkey"
            columns: ["divisi_id"]
            isOneToOne: false
            referencedRelation: "divisi"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          created_at: string
          id: string
          photo_path: string
          report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_path: string
          report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_path?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validasi_reports: {
        Row: {
          catatan: string | null
          created_at: string
          id: string
          report_id: string
          status: Database["public"]["Enums"]["status_validasi"]
          supervisor_id: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          id?: string
          report_id: string
          status: Database["public"]["Enums"]["status_validasi"]
          supervisor_id: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          id?: string
          report_id?: string
          status?: Database["public"]["Enums"]["status_validasi"]
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validasi_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_aktif: { Args: { _user_id: string }; Returns: boolean }
      my_divisi: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "karyawan" | "magang"
      status_kerja: "belum_mulai" | "sedang_berjalan" | "selesai" | "pending"
      status_validasi: "menunggu" | "disetujui" | "ditolak" | "direvisi"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "supervisor", "karyawan", "magang"],
      status_kerja: ["belum_mulai", "sedang_berjalan", "selesai", "pending"],
      status_validasi: ["menunggu", "disetujui", "ditolak", "direvisi"],
    },
  },
} as const
