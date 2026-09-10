import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const roles = [
  "admin",
  "supervisor",
  "karyawan",
  "magang",
] as const;

type AppRole = (typeof roles)[number];

type CreateUserPayload = {
  nama?: unknown;
  email?: unknown;
  password?: unknown;
  nik_nim?: unknown;
  no_hp?: unknown;
  jabatan?: unknown;
  divisi_id?: unknown;
  role?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function optionalText(
  value: unknown,
  field: string,
  maxLength = 255
) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${field} harus berupa teks`);
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new Error(
      `${field} maksimal ${maxLength} karakter`
    );
  }

  return text || null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat membuat akun pengguna";
}

Deno.serve(async (request: Request) => {
  // =====================================================
  // CORS
  // =====================================================

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method tidak diizinkan",
      },
      405
    );
  }

  // =====================================================
  // SUPABASE CONFIGURATION
  // =====================================================

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const publicKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !supabaseUrl ||
    !publicKey ||
    !serviceRoleKey
  ) {
    console.error(
      "Konfigurasi Supabase untuk create-user belum lengkap",
      {
        hasUrl: !!supabaseUrl,
        hasPublicKey: !!publicKey,
        hasServiceRoleKey: !!serviceRoleKey,
      }
    );

    return jsonResponse(
      {
        error: "Konfigurasi server belum lengkap",
      },
      500
    );
  }

  // =====================================================
  // CEK TOKEN ADMIN
  // =====================================================

  const authorization =
    request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(
      {
        error: "Autentikasi diperlukan",
      },
      401
    );
  }

  const token =
    authorization
      .slice("Bearer ".length)
      .trim();

  if (!token) {
    return jsonResponse(
      {
        error: "Token autentikasi tidak valid",
      },
      401
    );
  }

  // =====================================================
  // CLIENT USER
  // Digunakan untuk membaca user yang sedang login
  // =====================================================

  const supabase = createClient(
    supabaseUrl,
    publicKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser(token);

  if (
    userError ||
    !userData.user
  ) {
    console.error(
      "Sesi pengguna tidak valid:",
      userError
    );

    return jsonResponse(
      {
        error: "Sesi pengguna tidak valid",
      },
      401
    );
  }

  // =====================================================
  // ADMIN CLIENT
  // Service Role hanya digunakan di server/Edge Function
  // =====================================================

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // =====================================================
  // CEK APAKAH PEMBUAT ADALAH ADMIN
  // =====================================================

  const {
    data: adminRole,
    error: roleError,
  } = await adminClient
    .from("user_roles")
    .select("role")
    .eq(
      "user_id",
      userData.user.id
    )
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error(
      "Gagal memeriksa hak akses:",
      roleError
    );

    return jsonResponse(
      {
        error:
          "Gagal memeriksa hak akses",
      },
      500
    );
  }

  if (!adminRole) {
    return jsonResponse(
      {
        error:
          "Hanya admin yang dapat membuat pengguna baru",
      },
      403
    );
  }

  // =====================================================
  // BACA REQUEST BODY
  // =====================================================

  let payload: CreateUserPayload;

  try {
    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        {
          error:
            "Body request tidak valid",
        },
        400
      );
    }

    payload =
      body as CreateUserPayload;
  } catch {
    return jsonResponse(
      {
        error:
          "Body request harus berupa JSON yang valid",
      },
      400
    );
  }

  // =====================================================
  // VALIDASI DATA
  // =====================================================

  try {
    const nama = optionalText(
      payload.nama,
      "Nama lengkap",
      150
    );

    const email =
      typeof payload.email === "string"
        ? payload.email
            .trim()
            .toLowerCase()
        : "";

    const password =
      payload.password;

    const role =
      payload.role;

    // Nama
    if (!nama) {
      throw new Error(
        "Nama lengkap wajib diisi"
      );
    }

    // Email
    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      throw new Error(
        "Format email tidak valid"
      );
    }

    // Password
    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      throw new Error(
        "Password minimal 6 karakter"
      );
    }

    if (password.length > 128) {
      throw new Error(
        "Password maksimal 128 karakter"
      );
    }

    // Role
    if (
      typeof role !== "string" ||
      !roles.includes(
        role as AppRole
      )
    ) {
      throw new Error(
        "Role pengguna tidak valid"
      );
    }

    // Data tambahan
    const nikNim =
      optionalText(
        payload.nik_nim,
        "NIK/NIM"
      );

    const noHp =
      optionalText(
        payload.no_hp,
        "Nomor HP"
      );

    const jabatan =
      optionalText(
        payload.jabatan,
        "Jabatan"
      );

    const divisiId =
      optionalText(
        payload.divisi_id,
        "Divisi"
      );

    // =====================================================
    // VALIDASI DIVISI
    // =====================================================

    if (
      divisiId &&
      !isUuid(divisiId)
    ) {
      throw new Error(
        "ID divisi tidak valid"
      );
    }

    if (divisiId) {
      const {
        data: division,
        error: divisionError,
      } =
        await adminClient
          .from("divisi")
          .select("id")
          .eq("id", divisiId)
          .maybeSingle();

      if (divisionError) {
        console.error(
          "Gagal memeriksa divisi:",
          divisionError
        );

        return jsonResponse(
          {
            error:
              "Gagal memeriksa divisi",
          },
          500
        );
      }

      if (!division) {
        throw new Error(
          "Divisi yang dipilih tidak ditemukan"
        );
      }
    }

    // =====================================================
    // BUAT USER DI SUPABASE AUTH
    // =====================================================

    const {
      data: created,
      error: createError,
    } =
      await adminClient.auth.admin.createUser(
        {
          email,
          password,

          // Admin membuat akun,
          // jadi langsung bisa login
          email_confirm: true,

          // Metadata akan dibaca oleh
          // trigger handle_new_user()
          user_metadata: {
            nama,
            nik_nim: nikNim,
            no_hp: noHp,
            jabatan,
            divisi_id: divisiId,
            role,
          },
        }
      );

    // =====================================================
    // HANDLE ERROR AUTH
    // =====================================================

    if (
      createError ||
      !created.user
    ) {
      const message =
        createError?.message ??
        "Akun gagal dibuat";

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes(
          "already registered"
        ) ||
        normalizedMessage.includes(
          "already exists"
        ) ||
        normalizedMessage.includes(
          "user already registered"
        ) ||
        normalizedMessage.includes(
          "duplicate"
        )
      ) {
        return jsonResponse(
          {
            error:
              "Email tersebut sudah terdaftar",
          },
          409
        );
      }

      console.error(
        "Gagal membuat akun Supabase Auth:",
        createError
      );

      return jsonResponse(
        {
          error:
            message ||
            "Gagal membuat akun pengguna",
        },
        400
      );
    }

    // =====================================================
    // BERHASIL
    //
    // Trigger handle_new_user() akan membuat:
    //
    // auth.users
    //      ↓
    // profiles
    //      +
    // user_roles
    //
    // =====================================================

    console.log(
      "Akun berhasil dibuat:",
      {
        id: created.user.id,
        email: created.user.email,
        role,
      }
    );

    return jsonResponse({
      message:
        "Akun pengguna berhasil dibuat",

      user: {
        id: created.user.id,
        email: created.user.email,
        role,
      },
    });
  } catch (error) {
    console.error(
      "Error create-user:",
      error
    );

    return jsonResponse(
      {
        error:
          getErrorMessage(error),
      },
      400
    );
  }
});