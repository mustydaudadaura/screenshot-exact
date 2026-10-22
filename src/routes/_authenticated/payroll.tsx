import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { departmentsQuery } from "./departments";
import { computePayroll, lagosToday, naira } from "@/lib/pay";

const PRODUCTION = ["Premix", "Mixing and Milling", "Baking", "Second Baking", "Moulding and Panning", "Packaging"];

const baseQuery = queryOptions({
  queryKey: ["payroll", "base"],
  queryFn: async () => {
    const [w, r] = await Promise.all([
      supabase.from("workers").select("id, full_name, department_id, is_active").order("full_name"),
      supabase.from("department_pay_rates").select("department_id, rate_per_bag, effective_from").order("effective_from", { ascending: false }),
    ]);
    if (w.error) throw w.error;
    return { workers: w.data, rates: r.data ?? [] };
  },
});

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({ meta: [{ title: "Payroll — A&M Global Concept Bakery" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(baseQuery), context.queryClient.ensureQueryData(departmentsQuery)]),
  component: Payroll,
});

function Payroll() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Payroll" subtitle="Record bags of flour used per team each day; pay is shared among workers who clocked in." />
      <Tabs defaultValue="daily">
        <TabsList className="mb-4">
          <TabsTrigger value="daily">Daily bags</TabsTrigger>
          <TabsTrigger value="report">Pay report</TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><DailyBags /></TabsContent>
        <TabsContent value="report"><Report /></TabsContent>
      </Tabs>
    </div>
  );
}

function DailyBags() {
  const { data: base } = useSuspenseQuery(baseQuery);
  const { data: depts } = useSuspenseQuery(departmentsQuery);
  const qc = useQueryClient();
  const [date, setDate] = useState(lagosToday());
  const teams = depts.filter((d) => d.is_active && PRODUCTION.includes(d.name));
  const day = useQuery({
    queryKey: ["payroll", "day", date],
    queryFn: async () => {
      const [l, a] = await Promise.all([
        supabase.from("production_logs").select("*").eq("work_date", date),
        supabase.from("attendance").select("worker_id").eq("work_date", date),
      ]);
      return { logs: l.data ?? [], present: new Set((a.data ?? []).map((x) => x.worker_id)) };
    },
  });
  const [bags, setBags] = useState<Record<string, string>>({});
  const rateFor = (deptId: string) => Number(base.rates.find((r) => r.department_id === deptId)?.rate_per_bag ?? 0);

  async function save(deptId: string): Promise<void> {
    const raw = bags[deptId];
    const n = Number(raw);
    if (raw === undefined || raw === "" || isNaN(n) || n < 0) return void toast.error("Enter number of bags");
    const existing = day.data?.logs.find((l) => l.department_id === deptId);
    const rate = existing ? Number(existing.rate_per_bag) : rateFor(deptId);
    if (!existing && rate === 0) return void toast.error("Set this team's pay per bag first (Workers & Pay)");
    const { error } = existing
      ? await supabase.from("production_logs").update({ bags: n }).eq("id", existing.id)
      : await supabase.from("production_logs").insert({ department_id: deptId, work_date: date, bags: n, rate_per_bag: rate });
    if (error) return void toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["payroll"] });
  }

  return (
    <div>
      <div className="mb-4 max-w-xs"><Label>Date</Label><Input type="date" value={date} max={lagosToday()} onChange={(e) => { setDate(e.target.value); setBags({}); }} className="mt-1 h-11" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((t) => {
          const log = day.data?.logs.find((l) => l.department_id === t.id);
          const presentCount = base.workers.filter((w) => w.department_id === t.id && day.data?.present.has(w.id)).length;
          const rate = log ? Number(log.rate_per_bag) : rateFor(t.id);
          const b = Number(bags[t.id] ?? log?.bags ?? 0);
          const total = b * rate;
          return (
            <div key={t.id} className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex justify-between"><h3 className="font-display text-lg">{t.name}</h3><span className="text-sm text-muted-foreground">{presentCount} present</span></div>
              <div className="mt-1 text-sm text-muted-foreground">{naira(rate)} per bag{log && " (rate locked for this day)"}</div>
              <div className="mt-3 flex gap-2">
                <Input type="number" min={0} step="0.5" placeholder="Bags" value={bags[t.id] ?? (log ? String(log.bags) : "")} onChange={(e) => setBags({ ...bags, [t.id]: e.target.value })} className="h-11" />
                <Button className="h-11" onClick={() => save(t.id)}>{log ? "Update" : "Save"}</Button>
              </div>
              <div className="mt-3 text-sm">Team total <strong>{naira(total)}</strong> · {presentCount ? `${naira(total / presentCount)} each` : "nobody clocked in"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Report() {
  const { data: base } = useSuspenseQuery(baseQuery);
  const { data: depts } = useSuspenseQuery(departmentsQuery);
  const today = lagosToday();
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const rep = useQuery({
    queryKey: ["payroll", "report", from, to],
    queryFn: async () => {
      const [l, a] = await Promise.all([
        supabase.from("production_logs").select("department_id, work_date, bags, rate_per_bag").gte("work_date", from).lte("work_date", to),
        supabase.from("attendance").select("worker_id, work_date").gte("work_date", from).lte("work_date", to).limit(10000),
      ]);
      return { logs: l.data ?? [], punches: a.data ?? [] };
    },
  });
  const result = useMemo(
    () => (rep.data ? computePayroll(rep.data.logs.map((l) => ({ ...l, bags: Number(l.bags), rate_per_bag: Number(l.rate_per_bag) })), rep.data.punches, base.workers) : null),
    [rep.data, base.workers],
  );
  const rows = base.workers
    .map((w) => ({ ...w, ...(result?.get(w.id) ?? { days: 0, amount: 0 }), dept: depts.find((d) => d.id === w.department_id)?.name ?? "" }))
    .filter((r) => r.days > 0 || r.is_active)
    .sort((a, b) => a.dept.localeCompare(b.dept) || a.full_name.localeCompare(b.full_name));
  const grand = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-11" /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-11" /></div>
        <Button variant="outline" className="h-11" onClick={() => window.print()}><Printer /> Print</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Worker</th><th className="p-3">Team</th><th className="p-3 text-right">Days worked</th><th className="p-3 text-right">Amount</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}><td className="p-3 font-medium">{r.full_name}</td><td className="p-3 text-muted-foreground">{r.dept}</td><td className="p-3 text-right">{r.days}</td><td className="p-3 text-right tabular-nums">{naira(r.amount)}</td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No workers yet.</td></tr>}
          </tbody>
          <tfoot><tr className="border-t-2 font-semibold"><td className="p-3" colSpan={3}>Total payroll</td><td className="p-3 text-right tabular-nums">{naira(grand)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
