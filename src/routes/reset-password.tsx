import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, LockKeyhole } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: `Reset Password — ${APP_NAME}` },
      {
        name: "description",
        content: "Buat password baru untuk akun Merapi Tani Instrumen.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timeout = window.setTimeout(() => {
      if (mounted) setChecking(false);
    }, 2000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setReady(true);
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (password !== confirmation) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("Gagal mengubah password: " + error.message);
      return;
    }

    await supabase.auth.signOut();
    toast.success("Password berhasil diubah. Silakan masuk dengan password baru.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </div>
          <CardTitle className="font-display">Buat Password Baru</CardTitle>
          <CardDescription>
            Tautan reset berasal dari email resmi {APP_NAME}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memeriksa tautan reset...
            </div>
          ) : !ready ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru dari
                halaman masuk.
              </p>
              <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Kembali ke Halaman Masuk
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password baru</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={6}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Ulangi password baru</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  minLength={6}
                  maxLength={72}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Simpan Password Baru
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}