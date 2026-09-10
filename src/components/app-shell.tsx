import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,

  ClipboardList,
  Clock,

  FileDown,
  Images,
  LayoutDashboard,
  LogOut,

  Menu,

  UserCircle,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { APP_NAME, COMPANY, ROLE_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles?: string[] };

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Utama",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/laporan", label: "Daily Report", icon: ClipboardList },
      { to: "/validasi", label: "Validasi Report", icon: BadgeCheck, roles: ["admin", "supervisor"] },
      { to: "/galeri", label: "Galeri Bukti", icon: Images },
    ],
  },
  {
    group: "Operasional",
    items: [{ to: "/template", label: "Template Laporan", icon: FileDown }],
  },

  {
    group: "Master Data",
    items: [
      { to: "/divisi", label: "Divisi", icon: Building2, roles: ["admin"] },
      { to: "/pengguna", label: "Data Pengguna", icon: Users, roles: ["admin"] },
      { to: "/profil", label: "Profil Saya", icon: UserCircle },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (me?.nama ?? "MT")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  if (me && !me.status_aktif) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-warning/15">
            <Clock className="size-5 text-warning-foreground" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold">Menunggu persetujuan Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hai {me.nama}, pendaftaran Anda sudah kami terima. Akun akan aktif setelah Admin{" "}
            {COMPANY} menyetujuinya. Silakan coba masuk kembali nanti.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
              Periksa lagi
            </Button>
            <Button variant="secondary" onClick={signOut}>
              Keluar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {open && (
        <button
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
            <img src="/mertani-logo.png" alt="Logo Mertani" className="size-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">Merapi Tani Instrumen</p>
            <p className="truncate text-xs text-sidebar-foreground/70">Daily Report System</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV.map((group) => {
            const items = group.items.filter(
              (i) => !i.roles || (me && i.roles.includes(me.role)),
            );
            if (!items.length) return null;
            return (
              <div key={group.group}>
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.group}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active = pathname === item.to;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{me?.nama}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {me ? ROLE_LABEL[me.role] : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Keluar"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">{APP_NAME}</p>
            <p className="truncate text-xs text-muted-foreground">{COMPANY}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground lg:px-6">
          &copy; {new Date().getFullYear()} {COMPANY} — Internal Daily Report System
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}
