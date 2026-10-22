import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("business_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Business Settings — GCBMS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: Settings,
});

const FIELDS = [
  { k: "business_name", l: "Business name" },
  { k: "address", l: "Address" },
  { k: "phone", l: "Phone" },
  { k: "currency", l: "Currency" },
  { k: "timezone", l: "Time zone" },
  { k: "invoice_prefix", l: "Invoice number prefix" },
  { k: "receipt_prefix", l: "Receipt number prefix" },
  { k: "dispatch_prefix", l: "Dispatch number prefix" },
  { k: "remittance_deadline_hours", l: "Remittance deadline (hours)", n: true },
  { k: "default_credit_limit", l: "Default credit limit (₦)", n: true },
] as const;

function Settings() {
  const { data } = useSuspenseQuery(settingsQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>(data);
  const [busy, setBusy] = useState(false);

  async function save(): Promise<void> {
    if (!String(form["business_name"] ?? "").trim()) return void toast.error("Business name is required");
    if (Number(form["remittance_deadline_hours"]) < 0 || Number(form["default_credit_limit"]) < 0) return void toast.error("Numbers cannot be negative");
    setBusy(true);
    const patch = Object.fromEntries(FIELDS.map((f) => [f.k, "n" in f ? Number(form[f.k]) : form[f.k] || null]));
    const { error } = await supabase.from("business_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Business Settings" subtitle="Changes are recorded in the audit trail and apply going forward." />
      <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.k}>
            <Label>{f.l}</Label>
            <Input className="mt-1 h-11" type={"n" in f ? "number" : "text"} min={0} value={form[f.k] ?? ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
          </div>
        ))}
        <div className="sm:col-span-2"><Button size="lg" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button></div>
      </div>
    </div>
  );
}
