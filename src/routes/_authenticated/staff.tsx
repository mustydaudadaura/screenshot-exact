import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ALL_ROLES, ROLE_LABELS, type AppRole } from "@/lib/roles";
import { createStaff, setStaffActive, updateStaffAccess } from "@/lib/staff.functions";
import { departmentsQuery } from "./departments";
import { useMe } from "@/hooks/use-me";

const staffQuery = queryOptions({
  queryKey: ["staff"],
  queryFn: async () => {
    const [p, r, d] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("staff_departments").select("user_id, department_id"),
    ]);
    if (p.error) throw p.error;
    return (p.data ?? []).map((s) => ({
      ...s,
      roles: (r.data ?? []).filter((x) => x.user_id === s.id).map((x) => x.role as AppRole),
      department_ids: (d.data ?? []).filter((x) => x.user_id === s.id).map((x) => x.department_id),
    }));
  },
});

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff — GCBMS" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(staffQuery), context.queryClient.ensureQueryData(departmentsQuery)]),
  component: Staff,
});

type Staff = Awaited<ReturnType<typeof staffQuery.queryFn>>[number];

function Staff() {
  const { data: staff } = useSuspenseQuery(staffQuery);
  const { data: depts } = useSuspenseQuery(departmentsQuery);
  const me = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const deptName = (id: string) => depts.find((d) => d.id === id)?.name ?? "";
  const filtered = useMemo(
    () => staff.filter((s) => `${s.full_name} ${s.email} ${s.job_title ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [staff, q],
  );

  async function toggleActive(s: Staff) {
    if (!confirm(`${s.is_active ? "Deactivate" : "Reactivate"} ${s.full_name}?`)) return;
    try {
      await setStaffActive({ data: { user_id: s.id, active: !s.is_active } });
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Staff" subtitle={`${staff.length} accounts`} action={<Button size="lg" onClick={() => setEditing("new")}><Plus /> Add staff</Button>} />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or job title" className="h-11 pl-10" />
      </div>
      <div className="grid gap-3">
        {filtered.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
            <div className="min-w-48 flex-1">
              <div className="flex items-center gap-2 text-base font-medium">
                {s.full_name || s.email} {!s.is_active && <Badge variant="destructive">Inactive</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">{s.job_title || "—"} · {s.email}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r]}</Badge>)}
                {s.department_ids.map((id) => <Badge key={id} variant="outline">{deptName(id)}</Badge>)}
              </div>
            </div>
            <Button variant="outline" onClick={() => setEditing(s)}>Edit access</Button>
            {s.id !== me.id && <Button variant="ghost" onClick={() => toggleActive(s)}>{s.is_active ? "Deactivate" : "Reactivate"}</Button>}
          </div>
        ))}
      </div>
      {editing && (
        <StaffDialog
          staff={editing === "new" ? null : editing}
          depts={depts.filter((d) => d.is_active)}
          canGrantOwner={me.roles.includes("owner")}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["staff"] }); qc.invalidateQueries({ queryKey: ["me"] }); }}
        />
      )}
    </div>
  );
}

function StaffDialog({ staff, depts, canGrantOwner, onClose, onSaved }: {
  staff: Staff | null; depts: { id: string; name: string }[]; canGrantOwner: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", job_title: "" });
  const [roles, setRoles] = useState<AppRole[]>(staff?.roles ?? ["staff"]);
  const [deptIds, setDeptIds] = useState<string[]>(staff?.department_ids ?? []);
  const [busy, setBusy] = useState(false);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function save() {
    if (!roles.length) return toast.error("Pick at least one role");
    setBusy(true);
    try {
      if (staff) await updateStaffAccess({ data: { user_id: staff.id, roles, department_ids: deptIds } });
      else await createStaff({ data: { ...form, phone: form.phone || undefined, job_title: form.job_title || undefined, roles, department_ids: deptIds } });
      toast.success(staff ? "Access updated" : "Staff account created");
      onSaved();
    } catch (e: any) {
      toast.error(e.message?.includes("[") ? "Please check the form: name, valid email and 8+ character password are required." : e.message);
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{staff ? `Access for ${staff.full_name}` : "Add staff member"}</DialogTitle></DialogHeader>
        {!staff && (
          <div className="grid gap-3 sm:grid-cols-2">
            {([["full_name", "Full name"], ["email", "Email"], ["password", "Temporary password"], ["phone", "Phone"], ["job_title", "Job title"]] as const).map(([k, l]) => (
              <div key={k} className={k === "full_name" ? "sm:col-span-2" : ""}>
                <Label>{l}</Label>
                <Input type={k === "password" ? "password" : k === "email" ? "email" : "text"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 h-11" />
              </div>
            ))}
          </div>
        )}
        <div>
          <Label className="text-base">Job roles</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ALL_ROLES.filter((r) => r !== "owner" || canGrantOwner).map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-lg border p-2"><Checkbox checked={roles.includes(r)} onCheckedChange={() => setRoles(toggle(roles, r))} />{ROLE_LABELS[r]}</label>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-base">Departments</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {depts.map((d) => (
              <label key={d.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><Checkbox checked={deptIds.includes(d.id)} onCheckedChange={() => setDeptIds(toggle(deptIds, d.id))} />{d.name}</label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="lg" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
