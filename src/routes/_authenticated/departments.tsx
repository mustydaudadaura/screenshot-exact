import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const departmentsQuery = queryOptions({
  queryKey: ["departments"],
  queryFn: async () => {
    const { data, error } = await supabase.from("departments").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({ meta: [{ title: "Departments — GCBMS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(departmentsQuery),
  component: Departments,
});

function Departments() {
  const { data } = useSuspenseQuery(departmentsQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["departments"] });

  const add = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (n.length < 2) throw new Error("Enter a department name");
      const { error } = await supabase.from("departments").insert({ name: n, sort_order: data.length + 1 });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); toast.success("Department added"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function update(id: string, patch: { name?: string; is_active?: boolean }) {
    const { error } = await supabase.from("departments").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Departments" subtitle="Rename, add, deactivate or reactivate departments." />
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mb-6 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New department name" className="h-11" maxLength={80} />
        <Button type="submit" size="lg" disabled={add.isPending}>Add</Button>
      </form>
      <div className="divide-y rounded-xl border bg-card">
        {data.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-3 p-4">
            {editing?.id === d.id ? (
              <Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-10 flex-1" />
            ) : (
              <span className={`flex-1 text-base ${d.is_active ? "" : "text-muted-foreground line-through"}`}>{d.name}</span>
            )}
            {!d.is_active && <Badge variant="outline">Inactive</Badge>}
            {editing?.id === d.id ? (
              <>
                <Button size="sm" onClick={() => update(d.id, { name: editing.name.trim() })}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing({ id: d.id, name: d.name })}>Rename</Button>
                <Button size="sm" variant={d.is_active ? "ghost" : "secondary"} onClick={() => update(d.id, { is_active: !d.is_active })}>
                  {d.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
