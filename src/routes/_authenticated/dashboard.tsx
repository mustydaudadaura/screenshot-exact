import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Users, Building2, Settings } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { isManager, ROLE_LABELS, ROLE_TASKS } from "@/lib/roles";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — GCBMS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const manager = isManager(me.roles);
  const tasks = me.roles.flatMap((r) => (ROLE_TASKS[r] ?? []).map((t) => ({ role: r, task: t })));
  const hour = Number(new Date().toLocaleString("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`${greet}, ${me.profile?.full_name?.split(" ")[0] || "there"}`}
        subtitle={me.departments.length ? me.departments.join(" · ") : "No department assigned yet"}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {me.roles.map((r) => <Badge key={r} variant="secondary" className="text-sm">{ROLE_LABELS[r]}</Badge>)}
      </div>

      {manager && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl">Owner tools</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { to: "/staff", label: "Manage staff", icon: Users },
              { to: "/departments", label: "Departments", icon: Building2 },
              { to: "/settings", label: "Business settings", icon: Settings },
            ].map((t) => (
              <Link key={t.to} to={t.to} className="flex items-center gap-3 rounded-xl bg-crust p-5 text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
                <t.icon className="h-6 w-6" /><span className="text-lg font-medium">{t.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl">My tasks</h2>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-6 text-muted-foreground">
            {manager ? "Assign job roles to staff and their task buttons appear here for them." : "No tasks yet. Ask your supervisor to assign your job role."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((t) => (
              <div key={t.role + t.task} className="rounded-xl border bg-card p-5 shadow-soft">
                <ClipboardList className="h-6 w-6 text-primary" />
                <div className="mt-3 text-lg font-medium">{t.task}</div>
                <div className="mt-1 text-sm text-muted-foreground">{ROLE_LABELS[t.role]} · coming in the next phase</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
