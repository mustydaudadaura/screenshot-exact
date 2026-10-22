import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { departmentsQuery } from "./departments";
import { computeTeamPay, naira } from "@/lib/pay";

const PRODUCTION = ["Premix", "Mixing and Milling", "Baking", "Second Baking", "Moulding and Panning", "Packaging"];

const workersQuery = queryOptions({
  queryKey: ["workers"],
  queryFn: async () => {
    const [w, r] = await Promise.all([
      supabase.from("workers").select("*").order("full_name"),
      supabase.from("department_pay_rates").select("*").order("effective_from", { ascending: false }),
    ]);
    if (w.error) throw w.error;
    if (r.error) throw r.error;
    return { workers: w.data, rates: r.data };
  },
});

export const Route = createFileRoute("/_authenticated/workers")({
  head: () => ({ meta: [{ title: "Workers & Pay per Bag — GCBMS" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(workersQuery), context.queryClient.ensureQueryData(departmentsQuery)]),
  component: Workers,
});

function Workers() {
  const { data: depts } = useSuspenseQuery(departmentsQuery);
  const { data } = useSuspenseQuery(workersQuery);
  const prod = depts.filter((d) => d.is_active && PRODUCTION.includes(d.name));
  const others = depts.filter((d) => d.is_active && !PRODUCTION.includes(d.name));
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? [...prod, ...others] : prod;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Workers & Pay per Bag"
        subtitle="Add the workers in each team and set the team's total pay for every bag of flour. Pay is shared equally."
        action={<Button variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? "Production teams only" : "Show all departments"}</Button>}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((d) => (
          <TeamCard
            key={d.id}
            dept={d}
            workers={data.workers.filter((w) => w.department_id === d.id)}
            rates={data.rates.filter((r) => r.department_id === d.id)}
          />
        ))}
      </div>
    </div>
  );
}

type Data = Awaited<ReturnType<NonNullable<typeof workersQuery.queryFn>>>;

function TeamCard({ dept, workers, rates }: { dept: { id: string; name: string }; workers: Data["workers"]; rates: Data["rates"] }) {
  const qc = useQueryClient();
  const current = rates[0];
  const [rate, setRate] = useState(current ? String(current.rate_per_bag) : "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bags, setBags] = useState("1");
  const active = workers.filter((w) => w.is_active);
  const preview = computeTeamPay(Number(bags) || 0, Number(current?.rate_per_bag ?? 0), active.length);
  const refresh = () => qc.invalidateQueries({ queryKey: ["workers"] });

  async function saveRate(): Promise<void> {
    const n = Number(rate);
    if (!rate || isNaN(n) || n < 0) return void toast.error("Enter a valid amount");
    if (current && Number(current.rate_per_bag) === n) return void toast.info("No change");
    const { error } = await supabase.from("department_pay_rates").insert({ department_id: dept.id, rate_per_bag: n });
    if (error) return void toast.error(error.message);
    toast.success(`${dept.name}: ${naira(n)} per bag from now on`);
    refresh();
  }

  async function addWorker(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (name.trim().length < 2) return void toast.error("Enter the worker's name");
    const { error } = await supabase.from("workers").insert({ full_name: name.trim(), phone: phone.trim() || null, department_id: dept.id });
    if (error) return void toast.error(error.message);
    setName(""); setPhone("");
    toast.success("Worker added");
    refresh();
  }

  async function setPin(id: string, who: string): Promise<void> {
    const pin = prompt(`New 4-digit kiosk PIN for ${who}`);
    if (pin === null) return;
    if (!/^\d{4}$/.test(pin)) return void toast.error("PIN must be exactly 4 digits");
    const { error } = await supabase.from("workers").update({ pin }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(`PIN set for ${who}`);
    refresh();
  }

  async function toggle(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase.from("workers").update({ is_active }).eq("id", id);
    if (error) return void toast.error(error.message);
    refresh();
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">{dept.name}</h2>
        <Badge variant="secondary">{active.length} workers</Badge>
      </div>

      <div className="mt-4">
        <Label>Team pay per bag of flour (₦)</Label>
        <div className="mt-1 flex gap-2">
          <Input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} className="h-11" placeholder="e.g. 2000" />
          <Button onClick={saveRate} className="h-11">Save</Button>
        </div>
        {rates.length > 1 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Previous: {rates.slice(1, 3).map((r) => `${naira(Number(r.rate_per_bag))} (${new Date(r.effective_from).toLocaleDateString("en-NG")})`).join(", ")}
          </p>
        )}
      </div>

      {current && (
        <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <div className="flex items-center gap-2">
            <Input type="number" min={0} value={bags} onChange={(e) => setBags(e.target.value)} className="h-9 w-20 bg-card" />
            <span>bags →</span>
            <strong>{naira(preview.total)}</strong>
            <span className="text-muted-foreground">· {naira(preview.perWorker)} each</span>
          </div>
        </div>
      )}

      <ul className="mt-4 divide-y">
        {workers.map((w) => (
          <li key={w.id} className="flex items-center justify-between py-2">
            <span className={w.is_active ? "" : "text-muted-foreground line-through"}>
              {w.full_name} {w.phone && <span className="text-sm text-muted-foreground">· {w.phone}</span>}
            </span>
            <span className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setPin(w.id, w.full_name)}>{w.pin ? "Change PIN" : "Set PIN"}</Button>
            <Button size="sm" variant="ghost" onClick={() => toggle(w.id, !w.is_active)}>{w.is_active ? "Remove" : "Restore"}</Button>
            </span>
          </li>
        ))}
        {workers.length === 0 && <li className="py-2 text-sm text-muted-foreground">No workers yet.</li>}
      </ul>

      <form onSubmit={addWorker} className="mt-3 flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Worker name" className="h-10 min-w-36 flex-1" maxLength={100} />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-10 w-32" maxLength={30} />
        <Button type="submit" variant="secondary" className="h-10"><UserPlus /> Add</Button>
      </form>
    </section>
  );
}
