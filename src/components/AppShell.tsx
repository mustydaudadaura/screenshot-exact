import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users, HardHat, Building2, Settings, ScrollText, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { isManager, ROLE_LABELS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import logo from "@/assets/am-logo.png.asset.json";

export function AppShell() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const manager = isManager(me.roles);

  const links = [
    { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard, show: true },
    { to: "/staff", label: "Staff", icon: Users, show: manager },
    { to: "/workers", label: "Workers & Pay", icon: HardHat, show: manager },
    { to: "/departments", label: "Departments", icon: Building2, show: manager },
    { to: "/settings", label: "Business Settings", icon: Settings, show: manager },
    { to: "/audit", label: "Audit Trail", icon: ScrollText, show: manager },
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (me.profile && !me.profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl">Account deactivated</h1>
          <p className="mt-2 text-muted-foreground">Please contact the bakery owner.</p>
          <Button className="mt-4" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground md:static md:flex`}>
        <div className="mx-4 my-5 rounded-xl bg-card p-3">
          <img src={logo.url} alt="A&M Global Concept Bakery" className="mx-auto h-24 w-auto" />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {links.filter((l) => l.show).map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
            >
              <l.icon className="h-5 w-5" /> {l.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="truncate text-sm font-medium">{me.profile?.full_name || me.email}</div>
          <div className="text-xs opacity-70">{me.roles.map((r) => ROLE_LABELS[r]).join(", ")}</div>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 text-sm opacity-80 hover:opacity-100">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></Button>
          <img src={logo.url} alt="A&M Global Concept Bakery" className="h-10 w-auto" />
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
