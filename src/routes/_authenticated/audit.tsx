import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";

const auditQuery = queryOptions({
  queryKey: ["audit"],
  queryFn: async () => {
    const [{ data, error }, { data: people }] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    if (error) throw error;
    const name = (id: string | null) => people?.find((p) => p.id === id)?.full_name || people?.find((p) => p.id === id)?.email || "System";
    return (data ?? []).map((a) => ({ ...a, actor: name(a.actor_id) }));
  },
});

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Trail — GCBMS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(auditQuery),
  component: Audit,
});

function Audit() {
  const { data } = useSuspenseQuery(auditQuery);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Audit Trail" subtitle="Latest 200 changes across the system." />
      <div className="divide-y rounded-xl border bg-card">
        {data.length === 0 && <p className="p-6 text-muted-foreground">No changes recorded yet.</p>}
        {data.map((a) => (
          <div key={a.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
            <div><span className="font-medium">{a.actor}</span> · {a.action.replace("_", " ")} <span className="text-muted-foreground">{a.entity.replace("_", " ")}</span></div>
            <time className="text-muted-foreground">{new Date(a.created_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</time>
          </div>
        ))}
      </div>
    </div>
  );
}
